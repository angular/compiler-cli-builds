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
        function DependencyResolver(logger, host) {
            this.logger = logger;
            this.host = host;
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
                var entryPointPath = getEntryPointPath(entryPoint);
                var _a = _this.host.findDependencies(entryPointPath), dependencies = _a.dependencies, missing = _a.missing, deepImports = _a.deepImports;
                if (missing.size > 0) {
                    // This entry point has dependencies that are missing
                    // so remove it from the graph.
                    removeNodes(entryPoint, Array.from(missing));
                }
                else {
                    dependencies.forEach(function (dependencyPath) {
                        if (graph.hasNode(dependencyPath)) {
                            // The dependency path maps to an entry point that exists in the graph
                            // so add the dependency.
                            graph.addDependency(entryPoint.path, dependencyPath);
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
    function getEntryPointPath(entryPoint) {
        var properties = Object.keys(entryPoint.packageJson);
        for (var i = 0; i < properties.length; i++) {
            var property = properties[i];
            var format = entry_point_1.getEntryPointFormat(property);
            if (format === 'esm2015' || format === 'esm5') {
                var formatPath = entryPoint.packageJson[property];
                return path_1.AbsoluteFsPath.resolve(entryPoint.path, formatPath);
            }
        }
        throw new Error("There is no format with import statements in '" + entryPoint.path + "' entry-point.");
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVwZW5kZW5jeV9yZXNvbHZlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9uZ2NjL3NyYy9kZXBlbmRlbmNpZXMvZGVwZW5kZW5jeV9yZXNvbHZlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFFSCxxREFBMEM7SUFFMUMsNkRBQXVEO0lBRXZELG1GQUFnRztJQXNEaEc7O09BRUc7SUFDSDtRQUNFLDRCQUFvQixNQUFjLEVBQVUsSUFBb0I7WUFBNUMsV0FBTSxHQUFOLE1BQU0sQ0FBUTtZQUFVLFNBQUksR0FBSixJQUFJLENBQWdCO1FBQUcsQ0FBQztRQUNwRTs7Ozs7O1dBTUc7UUFDSCx3REFBMkIsR0FBM0IsVUFBNEIsV0FBeUIsRUFBRSxNQUFtQjtZQUVsRSxJQUFBLDZDQUNzQyxFQURyQywwQ0FBa0IsRUFBRSw0Q0FBbUIsRUFBRSxnQkFDSixDQUFDO1lBRTdDLElBQUkscUJBQStCLENBQUM7WUFDcEMsSUFBSSxNQUFNLEVBQUU7Z0JBQ1YsSUFBSSxNQUFNLENBQUMsaUJBQWlCLEVBQUU7b0JBQzVCLHFCQUFxQixHQUFHLEtBQUssQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO29CQUMxRCxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO2lCQUN6QztxQkFBTTtvQkFDTCxxQkFBcUIsR0FBRyxFQUFFLENBQUM7aUJBQzVCO2FBQ0Y7aUJBQU07Z0JBQ0wscUJBQXFCLEdBQUcsS0FBSyxDQUFDLFlBQVksRUFBRSxDQUFDO2FBQzlDO1lBRUQsT0FBTztnQkFDTCxXQUFXLEVBQUUscUJBQXFCLENBQUMsR0FBRyxDQUFDLFVBQUEsSUFBSSxJQUFJLE9BQUEsS0FBSyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsRUFBdkIsQ0FBdUIsQ0FBQztnQkFD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QU8sQ0FBQyxVQUFBLElBQUk7b0JBQ3hCLGtCQUFrQixDQUFDLElBQUksQ0FBQyxFQUFDLFVBQVUsRUFBRSxLQUFLLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxFQUFFLG1CQUFtQixxQkFBQSxFQUFDLENBQUMsQ0FBQztvQkFDcEYsS0FBSyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDekIsQ0FBQyxDQUFDLENBQUM7WUFDTCxDQUFDO1FBQ0gsQ0FBQztRQUNILHlCQUFDO0lBQUQsQ0FBQyxBQTdGRCxJQTZGQztJQTdGWSxnREFBa0I7SUErRi9CLFNBQVMsaUJBQWlCLENBQUMsVUFBc0I7UUFDL0MsSUFBTSxVQUFVLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsV0FBVyxDQUFDLENBQUM7UUFDdkQsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLFVBQVUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUU7WUFDMUMsSUFBTSxRQUFRLEdBQUcsVUFBVSxDQUFDLENBQUMsQ0FBMkIsQ0FBQztZQUN6RCxJQUFNLE1BQU0sR0FBRyxpQ0FBbUIsQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUU3QyxJQUFJLE1BQU0sS0FBSyxTQUFTLElBQUksTUFBTSxLQUFLLE1BQU0sRUFBRTtnQkFDN0MsSUFBTSxVQUFVLEdBQUcsVUFBVSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUcsQ0FBQztnQkFDdEQsT0FBTyxxQkFBYyxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFFLFVBQVUsQ0FBQyxDQUFDO2FBQzVEO1NBQ0Y7UUFDRCxNQUFNLElBQUksS0FBSyxDQUFDLG1EQUFpRCxVQUFVLENBQUMsSUFBSSxtQkFBZ0IsQ0FBQyxDQUFDO0lBQ3BHLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7RGVwR3JhcGh9IGZyb20gJ2RlcGVuZGVuY3ktZ3JhcGgnO1xuXG5pbXBvcnQge0Fic29sdXRlRnNQYXRofSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvcGF0aCc7XG5pbXBvcnQge0xvZ2dlcn0gZnJvbSAnLi4vbG9nZ2luZy9sb2dnZXInO1xuaW1wb3J0IHtFbnRyeVBvaW50LCBFbnRyeVBvaW50SnNvblByb3BlcnR5LCBnZXRFbnRyeVBvaW50Rm9ybWF0fSBmcm9tICcuLi9wYWNrYWdlcy9lbnRyeV9wb2ludCc7XG5cbmltcG9ydCB7RGVwZW5kZW5jeUhvc3R9IGZyb20gJy4vZGVwZW5kZW5jeV9ob3N0JztcblxuXG5cbi8qKlxuICogSG9sZHMgaW5mb3JtYXRpb24gYWJvdXQgZW50cnkgcG9pbnRzIHRoYXQgYXJlIHJlbW92ZWQgYmVjYXVzZVxuICogdGhleSBoYXZlIGRlcGVuZGVuY2llcyB0aGF0IGFyZSBtaXNzaW5nIChkaXJlY3RseSBvciB0cmFuc2l0aXZlbHkpLlxuICpcbiAqIFRoaXMgbWlnaHQgbm90IGJlIGFuIGVycm9yLCBiZWNhdXNlIHN1Y2ggYW4gZW50cnkgcG9pbnQgbWlnaHQgbm90IGFjdHVhbGx5IGJlIHVzZWRcbiAqIGluIHRoZSBhcHBsaWNhdGlvbi4gSWYgaXQgaXMgdXNlZCB0aGVuIHRoZSBgbmdjYCBhcHBsaWNhdGlvbiBjb21waWxhdGlvbiB3b3VsZFxuICogZmFpbCBhbHNvLCBzbyB3ZSBkb24ndCBuZWVkIG5nY2MgdG8gY2F0Y2ggdGhpcy5cbiAqXG4gKiBGb3IgZXhhbXBsZSwgY29uc2lkZXIgYW4gYXBwbGljYXRpb24gdGhhdCB1c2VzIHRoZSBgQGFuZ3VsYXIvcm91dGVyYCBwYWNrYWdlLlxuICogVGhpcyBwYWNrYWdlIGluY2x1ZGVzIGFuIGVudHJ5LXBvaW50IGNhbGxlZCBgQGFuZ3VsYXIvcm91dGVyL3VwZ3JhZGVgLCB3aGljaCBoYXMgYSBkZXBlbmRlbmN5XG4gKiBvbiB0aGUgYEBhbmd1bGFyL3VwZ3JhZGVgIHBhY2thZ2UuXG4gKiBJZiB0aGUgYXBwbGljYXRpb24gbmV2ZXIgdXNlcyBjb2RlIGZyb20gYEBhbmd1bGFyL3JvdXRlci91cGdyYWRlYCB0aGVuIHRoZXJlIGlzIG5vIG5lZWQgZm9yXG4gKiBgQGFuZ3VsYXIvdXBncmFkZWAgdG8gYmUgaW5zdGFsbGVkLlxuICogSW4gdGhpcyBjYXNlIHRoZSBuZ2NjIHRvb2wgc2hvdWxkIGp1c3QgaWdub3JlIHRoZSBgQGFuZ3VsYXIvcm91dGVyL3VwZ3JhZGVgIGVuZC1wb2ludC5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBJbnZhbGlkRW50cnlQb2ludCB7XG4gIGVudHJ5UG9pbnQ6IEVudHJ5UG9pbnQ7XG4gIG1pc3NpbmdEZXBlbmRlbmNpZXM6IHN0cmluZ1tdO1xufVxuXG4vKipcbiAqIEhvbGRzIGluZm9ybWF0aW9uIGFib3V0IGRlcGVuZGVuY2llcyBvZiBhbiBlbnRyeS1wb2ludCB0aGF0IGRvIG5vdCBuZWVkIHRvIGJlIHByb2Nlc3NlZFxuICogYnkgdGhlIG5nY2MgdG9vbC5cbiAqXG4gKiBGb3IgZXhhbXBsZSwgdGhlIGByeGpzYCBwYWNrYWdlIGRvZXMgbm90IGNvbnRhaW4gYW55IEFuZ3VsYXIgZGVjb3JhdG9ycyB0aGF0IG5lZWQgdG8gYmVcbiAqIGNvbXBpbGVkIGFuZCBzbyB0aGlzIGNhbiBiZSBzYWZlbHkgaWdub3JlZCBieSBuZ2NjLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIElnbm9yZWREZXBlbmRlbmN5IHtcbiAgZW50cnlQb2ludDogRW50cnlQb2ludDtcbiAgZGVwZW5kZW5jeVBhdGg6IHN0cmluZztcbn1cblxuZXhwb3J0IGludGVyZmFjZSBEZXBlbmRlbmN5RGlhZ25vc3RpY3Mge1xuICBpbnZhbGlkRW50cnlQb2ludHM6IEludmFsaWRFbnRyeVBvaW50W107XG4gIGlnbm9yZWREZXBlbmRlbmNpZXM6IElnbm9yZWREZXBlbmRlbmN5W107XG59XG5cbi8qKlxuICogQSBsaXN0IG9mIGVudHJ5LXBvaW50cywgc29ydGVkIGJ5IHRoZWlyIGRlcGVuZGVuY2llcy5cbiAqXG4gKiBUaGUgYGVudHJ5UG9pbnRzYCBhcnJheSB3aWxsIGJlIG9yZGVyZWQgc28gdGhhdCBubyBlbnRyeSBwb2ludCBkZXBlbmRzIHVwb24gYW4gZW50cnkgcG9pbnQgdGhhdFxuICogYXBwZWFycyBsYXRlciBpbiB0aGUgYXJyYXkuXG4gKlxuICogU29tZSBlbnRyeSBwb2ludHMgb3IgdGhlaXIgZGVwZW5kZW5jaWVzIG1heSBiZSBoYXZlIGJlZW4gaWdub3JlZC4gVGhlc2UgYXJlIGNhcHR1cmVkIGZvclxuICogZGlhZ25vc3RpYyBwdXJwb3NlcyBpbiBgaW52YWxpZEVudHJ5UG9pbnRzYCBhbmQgYGlnbm9yZWREZXBlbmRlbmNpZXNgIHJlc3BlY3RpdmVseS5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBTb3J0ZWRFbnRyeVBvaW50c0luZm8gZXh0ZW5kcyBEZXBlbmRlbmN5RGlhZ25vc3RpY3MgeyBlbnRyeVBvaW50czogRW50cnlQb2ludFtdOyB9XG5cbi8qKlxuICogQSBjbGFzcyB0aGF0IHJlc29sdmVzIGRlcGVuZGVuY2llcyBiZXR3ZWVuIGVudHJ5LXBvaW50cy5cbiAqL1xuZXhwb3J0IGNsYXNzIERlcGVuZGVuY3lSZXNvbHZlciB7XG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgbG9nZ2VyOiBMb2dnZXIsIHByaXZhdGUgaG9zdDogRGVwZW5kZW5jeUhvc3QpIHt9XG4gIC8qKlxuICAgKiBTb3J0IHRoZSBhcnJheSBvZiBlbnRyeSBwb2ludHMgc28gdGhhdCB0aGUgZGVwZW5kYW50IGVudHJ5IHBvaW50cyBhbHdheXMgY29tZSBsYXRlciB0aGFuXG4gICAqIHRoZWlyIGRlcGVuZGVuY2llcyBpbiB0aGUgYXJyYXkuXG4gICAqIEBwYXJhbSBlbnRyeVBvaW50cyBBbiBhcnJheSBlbnRyeSBwb2ludHMgdG8gc29ydC5cbiAgICogQHBhcmFtIHRhcmdldCBJZiBwcm92aWRlZCwgb25seSByZXR1cm4gZW50cnktcG9pbnRzIGRlcGVuZGVkIG9uIGJ5IHRoaXMgZW50cnktcG9pbnQuXG4gICAqIEByZXR1cm5zIHRoZSByZXN1bHQgb2Ygc29ydGluZyB0aGUgZW50cnkgcG9pbnRzIGJ5IGRlcGVuZGVuY3kuXG4gICAqL1xuICBzb3J0RW50cnlQb2ludHNCeURlcGVuZGVuY3koZW50cnlQb2ludHM6IEVudHJ5UG9pbnRbXSwgdGFyZ2V0PzogRW50cnlQb2ludCk6XG4gICAgICBTb3J0ZWRFbnRyeVBvaW50c0luZm8ge1xuICAgIGNvbnN0IHtpbnZhbGlkRW50cnlQb2ludHMsIGlnbm9yZWREZXBlbmRlbmNpZXMsIGdyYXBofSA9XG4gICAgICAgIHRoaXMuY29tcHV0ZURlcGVuZGVuY3lHcmFwaChlbnRyeVBvaW50cyk7XG5cbiAgICBsZXQgc29ydGVkRW50cnlQb2ludE5vZGVzOiBzdHJpbmdbXTtcbiAgICBpZiAodGFyZ2V0KSB7XG4gICAgICBpZiAodGFyZ2V0LmNvbXBpbGVkQnlBbmd1bGFyKSB7XG4gICAgICAgIHNvcnRlZEVudHJ5UG9pbnROb2RlcyA9IGdyYXBoLmRlcGVuZGVuY2llc09mKHRhcmdldC5wYXRoKTtcbiAgICAgICAgc29ydGVkRW50cnlQb2ludE5vZGVzLnB1c2godGFyZ2V0LnBhdGgpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc29ydGVkRW50cnlQb2ludE5vZGVzID0gW107XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHNvcnRlZEVudHJ5UG9pbnROb2RlcyA9IGdyYXBoLm92ZXJhbGxPcmRlcigpO1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICBlbnRyeVBvaW50czogc29ydGVkRW50cnlQb2ludE5vZGVzLm1hcChwYXRoID0+IGdyYXBoLmdldE5vZGVEYXRhKHBhdGgpKSxcbiAgICAgIGludmFsaWRFbnRyeVBvaW50cyxcbiAgICAgIGlnbm9yZWREZXBlbmRlbmNpZXMsXG4gICAgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDb21wdXRlcyBhIGRlcGVuZGVuY3kgZ3JhcGggb2YgdGhlIGdpdmVuIGVudHJ5LXBvaW50cy5cbiAgICpcbiAgICogVGhlIGdyYXBoIG9ubHkgaG9sZHMgZW50cnktcG9pbnRzIHRoYXQgbmdjYyBjYXJlcyBhYm91dCBhbmQgd2hvc2UgZGVwZW5kZW5jaWVzXG4gICAqIChkaXJlY3QgYW5kIHRyYW5zaXRpdmUpIGFsbCBleGlzdC5cbiAgICovXG4gIHByaXZhdGUgY29tcHV0ZURlcGVuZGVuY3lHcmFwaChlbnRyeVBvaW50czogRW50cnlQb2ludFtdKTogRGVwZW5kZW5jeUdyYXBoIHtcbiAgICBjb25zdCBpbnZhbGlkRW50cnlQb2ludHM6IEludmFsaWRFbnRyeVBvaW50W10gPSBbXTtcbiAgICBjb25zdCBpZ25vcmVkRGVwZW5kZW5jaWVzOiBJZ25vcmVkRGVwZW5kZW5jeVtdID0gW107XG4gICAgY29uc3QgZ3JhcGggPSBuZXcgRGVwR3JhcGg8RW50cnlQb2ludD4oKTtcblxuICAgIGNvbnN0IGFuZ3VsYXJFbnRyeVBvaW50cyA9IGVudHJ5UG9pbnRzLmZpbHRlcihlbnRyeVBvaW50ID0+IGVudHJ5UG9pbnQuY29tcGlsZWRCeUFuZ3VsYXIpO1xuXG4gICAgLy8gQWRkIHRoZSBBbmd1bGFyIGNvbXBpbGVkIGVudHJ5IHBvaW50cyB0byB0aGUgZ3JhcGggYXMgbm9kZXNcbiAgICBhbmd1bGFyRW50cnlQb2ludHMuZm9yRWFjaChlbnRyeVBvaW50ID0+IGdyYXBoLmFkZE5vZGUoZW50cnlQb2ludC5wYXRoLCBlbnRyeVBvaW50KSk7XG5cbiAgICAvLyBOb3cgYWRkIHRoZSBkZXBlbmRlbmNpZXMgYmV0d2VlbiB0aGVtXG4gICAgYW5ndWxhckVudHJ5UG9pbnRzLmZvckVhY2goZW50cnlQb2ludCA9PiB7XG4gICAgICBjb25zdCBlbnRyeVBvaW50UGF0aCA9IGdldEVudHJ5UG9pbnRQYXRoKGVudHJ5UG9pbnQpO1xuICAgICAgY29uc3Qge2RlcGVuZGVuY2llcywgbWlzc2luZywgZGVlcEltcG9ydHN9ID0gdGhpcy5ob3N0LmZpbmREZXBlbmRlbmNpZXMoZW50cnlQb2ludFBhdGgpO1xuXG4gICAgICBpZiAobWlzc2luZy5zaXplID4gMCkge1xuICAgICAgICAvLyBUaGlzIGVudHJ5IHBvaW50IGhhcyBkZXBlbmRlbmNpZXMgdGhhdCBhcmUgbWlzc2luZ1xuICAgICAgICAvLyBzbyByZW1vdmUgaXQgZnJvbSB0aGUgZ3JhcGguXG4gICAgICAgIHJlbW92ZU5vZGVzKGVudHJ5UG9pbnQsIEFycmF5LmZyb20obWlzc2luZykpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZGVwZW5kZW5jaWVzLmZvckVhY2goZGVwZW5kZW5jeVBhdGggPT4ge1xuICAgICAgICAgIGlmIChncmFwaC5oYXNOb2RlKGRlcGVuZGVuY3lQYXRoKSkge1xuICAgICAgICAgICAgLy8gVGhlIGRlcGVuZGVuY3kgcGF0aCBtYXBzIHRvIGFuIGVudHJ5IHBvaW50IHRoYXQgZXhpc3RzIGluIHRoZSBncmFwaFxuICAgICAgICAgICAgLy8gc28gYWRkIHRoZSBkZXBlbmRlbmN5LlxuICAgICAgICAgICAgZ3JhcGguYWRkRGVwZW5kZW5jeShlbnRyeVBvaW50LnBhdGgsIGRlcGVuZGVuY3lQYXRoKTtcbiAgICAgICAgICB9IGVsc2UgaWYgKGludmFsaWRFbnRyeVBvaW50cy5zb21lKGkgPT4gaS5lbnRyeVBvaW50LnBhdGggPT09IGRlcGVuZGVuY3lQYXRoKSkge1xuICAgICAgICAgICAgLy8gVGhlIGRlcGVuZGVuY3kgcGF0aCBtYXBzIHRvIGFuIGVudHJ5LXBvaW50IHRoYXQgd2FzIHByZXZpb3VzbHkgcmVtb3ZlZFxuICAgICAgICAgICAgLy8gZnJvbSB0aGUgZ3JhcGgsIHNvIHJlbW92ZSB0aGlzIGVudHJ5LXBvaW50IGFzIHdlbGwuXG4gICAgICAgICAgICByZW1vdmVOb2RlcyhlbnRyeVBvaW50LCBbZGVwZW5kZW5jeVBhdGhdKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gVGhlIGRlcGVuZGVuY3kgcGF0aCBwb2ludHMgdG8gYSBwYWNrYWdlIHRoYXQgbmdjYyBkb2VzIG5vdCBjYXJlIGFib3V0LlxuICAgICAgICAgICAgaWdub3JlZERlcGVuZGVuY2llcy5wdXNoKHtlbnRyeVBvaW50LCBkZXBlbmRlbmN5UGF0aH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIGlmIChkZWVwSW1wb3J0cy5zaXplKSB7XG4gICAgICAgIGNvbnN0IGltcG9ydHMgPSBBcnJheS5mcm9tKGRlZXBJbXBvcnRzKS5tYXAoaSA9PiBgJyR7aX0nYCkuam9pbignLCAnKTtcbiAgICAgICAgdGhpcy5sb2dnZXIud2FybihcbiAgICAgICAgICAgIGBFbnRyeSBwb2ludCAnJHtlbnRyeVBvaW50Lm5hbWV9JyBjb250YWlucyBkZWVwIGltcG9ydHMgaW50byAke2ltcG9ydHN9LiBgICtcbiAgICAgICAgICAgIGBUaGlzIGlzIHByb2JhYmx5IG5vdCBhIHByb2JsZW0sIGJ1dCBtYXkgY2F1c2UgdGhlIGNvbXBpbGF0aW9uIG9mIGVudHJ5IHBvaW50cyB0byBiZSBvdXQgb2Ygb3JkZXIuYCk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICByZXR1cm4ge2ludmFsaWRFbnRyeVBvaW50cywgaWdub3JlZERlcGVuZGVuY2llcywgZ3JhcGh9O1xuXG4gICAgZnVuY3Rpb24gcmVtb3ZlTm9kZXMoZW50cnlQb2ludDogRW50cnlQb2ludCwgbWlzc2luZ0RlcGVuZGVuY2llczogc3RyaW5nW10pIHtcbiAgICAgIGNvbnN0IG5vZGVzVG9SZW1vdmUgPSBbZW50cnlQb2ludC5wYXRoLCAuLi5ncmFwaC5kZXBlbmRhbnRzT2YoZW50cnlQb2ludC5wYXRoKV07XG4gICAgICBub2Rlc1RvUmVtb3ZlLmZvckVhY2gobm9kZSA9PiB7XG4gICAgICAgIGludmFsaWRFbnRyeVBvaW50cy5wdXNoKHtlbnRyeVBvaW50OiBncmFwaC5nZXROb2RlRGF0YShub2RlKSwgbWlzc2luZ0RlcGVuZGVuY2llc30pO1xuICAgICAgICBncmFwaC5yZW1vdmVOb2RlKG5vZGUpO1xuICAgICAgfSk7XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIGdldEVudHJ5UG9pbnRQYXRoKGVudHJ5UG9pbnQ6IEVudHJ5UG9pbnQpOiBBYnNvbHV0ZUZzUGF0aCB7XG4gIGNvbnN0IHByb3BlcnRpZXMgPSBPYmplY3Qua2V5cyhlbnRyeVBvaW50LnBhY2thZ2VKc29uKTtcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBwcm9wZXJ0aWVzLmxlbmd0aDsgaSsrKSB7XG4gICAgY29uc3QgcHJvcGVydHkgPSBwcm9wZXJ0aWVzW2ldIGFzIEVudHJ5UG9pbnRKc29uUHJvcGVydHk7XG4gICAgY29uc3QgZm9ybWF0ID0gZ2V0RW50cnlQb2ludEZvcm1hdChwcm9wZXJ0eSk7XG5cbiAgICBpZiAoZm9ybWF0ID09PSAnZXNtMjAxNScgfHwgZm9ybWF0ID09PSAnZXNtNScpIHtcbiAgICAgIGNvbnN0IGZvcm1hdFBhdGggPSBlbnRyeVBvaW50LnBhY2thZ2VKc29uW3Byb3BlcnR5XSAhO1xuICAgICAgcmV0dXJuIEFic29sdXRlRnNQYXRoLnJlc29sdmUoZW50cnlQb2ludC5wYXRoLCBmb3JtYXRQYXRoKTtcbiAgICB9XG4gIH1cbiAgdGhyb3cgbmV3IEVycm9yKGBUaGVyZSBpcyBubyBmb3JtYXQgd2l0aCBpbXBvcnQgc3RhdGVtZW50cyBpbiAnJHtlbnRyeVBvaW50LnBhdGh9JyBlbnRyeS1wb2ludC5gKTtcbn1cblxuaW50ZXJmYWNlIERlcGVuZGVuY3lHcmFwaCBleHRlbmRzIERlcGVuZGVuY3lEaWFnbm9zdGljcyB7XG4gIGdyYXBoOiBEZXBHcmFwaDxFbnRyeVBvaW50Pjtcbn1cbiJdfQ==