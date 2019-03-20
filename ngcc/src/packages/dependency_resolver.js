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
        define("@angular/compiler-cli/ngcc/src/packages/dependency_resolver", ["require", "exports", "tslib", "canonical-path", "dependency-graph", "@angular/compiler-cli/src/ngtsc/path", "@angular/compiler-cli/ngcc/src/packages/entry_point"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var canonical_path_1 = require("canonical-path");
    var dependency_graph_1 = require("dependency-graph");
    var path_1 = require("@angular/compiler-cli/src/ngtsc/path");
    var entry_point_1 = require("@angular/compiler-cli/ngcc/src/packages/entry_point");
    /**
     * A class that resolves dependencies between entry-points.
     */
    var DependencyResolver = /** @class */ (function () {
        function DependencyResolver(host) {
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
            var _a = this.createDependencyInfo(entryPoints), invalidEntryPoints = _a.invalidEntryPoints, ignoredDependencies = _a.ignoredDependencies, graph = _a.graph;
            var sortedEntryPointNodes;
            if (target) {
                sortedEntryPointNodes = graph.dependenciesOf(target.path);
                sortedEntryPointNodes.push(target.path);
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
        DependencyResolver.prototype.createDependencyInfo = function (entryPoints) {
            var _this = this;
            var invalidEntryPoints = [];
            var ignoredDependencies = [];
            var graph = new dependency_graph_1.DepGraph();
            // Add the entry points to the graph as nodes
            entryPoints.forEach(function (entryPoint) { return graph.addNode(entryPoint.path, entryPoint); });
            // Now add the dependencies between them
            entryPoints.forEach(function (entryPoint) {
                var entryPointPath = getEntryPointPath(entryPoint);
                var _a = _this.host.computeDependencies(entryPointPath), dependencies = _a.dependencies, missing = _a.missing, deepImports = _a.deepImports;
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
                    console.warn("Entry point '" + entryPoint.name + "' contains deep imports into " + imports + ". " +
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
                return path_1.AbsoluteFsPath.from(canonical_path_1.resolve(entryPoint.path, formatPath));
            }
        }
        throw new Error("There is no format with import statements in '" + entryPoint.path + "' entry-point.");
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVwZW5kZW5jeV9yZXNvbHZlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9uZ2NjL3NyYy9wYWNrYWdlcy9kZXBlbmRlbmN5X3Jlc29sdmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7OztJQUVILGlEQUF1QztJQUN2QyxxREFBMEM7SUFFMUMsNkRBQXVEO0lBRXZELG1GQUFzRjtJQWtEdEY7O09BRUc7SUFDSDtRQUNFLDRCQUFvQixJQUFvQjtZQUFwQixTQUFJLEdBQUosSUFBSSxDQUFnQjtRQUFHLENBQUM7UUFDNUM7Ozs7OztXQU1HO1FBQ0gsd0RBQTJCLEdBQTNCLFVBQTRCLFdBQXlCLEVBQUUsTUFBbUI7WUFFbEUsSUFBQSwyQ0FBeUYsRUFBeEYsMENBQWtCLEVBQUUsNENBQW1CLEVBQUUsZ0JBQStDLENBQUM7WUFFaEcsSUFBSSxxQkFBK0IsQ0FBQztZQUNwQyxJQUFJLE1BQU0sRUFBRTtnQkFDVixxQkFBcUIsR0FBRyxLQUFLLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDMUQscUJBQXFCLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQzthQUN6QztpQkFBTTtnQkFDTCxxQkFBcUIsR0FBRyxLQUFLLENBQUMsWUFBWSxFQUFFLENBQUM7YUFDOUM7WUFFRCxPQUFPO2dCQUNMLFdBQVcsRUFBRSxxQkFBcUIsQ0FBQyxHQUFHLENBQUMsVUFBQSxJQUFJLElBQUksT0FBQSxLQUFLLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxFQUF2QixDQUF1QixDQUFDO2dCQUN2RSxrQkFBa0Isb0JBQUE7Z0JBQ2xCLG1CQUFtQixxQkFBQTthQUNwQixDQUFDO1FBQ0osQ0FBQztRQUVEOzs7OztXQUtHO1FBQ0ssaURBQW9CLEdBQTVCLFVBQTZCLFdBQXlCO1lBQXRE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QUQsQ0FBQyxBQXRGRCxJQXNGQztJQXRGWSxnREFBa0I7SUF3Ri9CLFNBQVMsaUJBQWlCLENBQUMsVUFBc0I7UUFDL0MsSUFBTSxVQUFVLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsV0FBVyxDQUFDLENBQUM7UUFDdkQsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLFVBQVUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUU7WUFDMUMsSUFBTSxRQUFRLEdBQUcsVUFBVSxDQUFDLENBQUMsQ0FBMkIsQ0FBQztZQUN6RCxJQUFNLE1BQU0sR0FBRyxpQ0FBbUIsQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUU3QyxJQUFJLE1BQU0sS0FBSyxTQUFTLElBQUksTUFBTSxLQUFLLE1BQU0sRUFBRTtnQkFDN0MsSUFBTSxVQUFVLEdBQUcsVUFBVSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUcsQ0FBQztnQkFDdEQsT0FBTyxxQkFBYyxDQUFDLElBQUksQ0FBQyx3QkFBTyxDQUFDLFVBQVUsQ0FBQyxJQUFJLEVBQUUsVUFBVSxDQUFDLENBQUMsQ0FBQzthQUNsRTtTQUNGO1FBQ0QsTUFBTSxJQUFJLEtBQUssQ0FBQyxtREFBaUQsVUFBVSxDQUFDLElBQUksbUJBQWdCLENBQUMsQ0FBQztJQUNwRyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge3Jlc29sdmV9IGZyb20gJ2Nhbm9uaWNhbC1wYXRoJztcbmltcG9ydCB7RGVwR3JhcGh9IGZyb20gJ2RlcGVuZGVuY3ktZ3JhcGgnO1xuXG5pbXBvcnQge0Fic29sdXRlRnNQYXRofSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvcGF0aCc7XG5pbXBvcnQge0RlcGVuZGVuY3lIb3N0fSBmcm9tICcuL2RlcGVuZGVuY3lfaG9zdCc7XG5pbXBvcnQge0VudHJ5UG9pbnQsIEVudHJ5UG9pbnRKc29uUHJvcGVydHksIGdldEVudHJ5UG9pbnRGb3JtYXR9IGZyb20gJy4vZW50cnlfcG9pbnQnO1xuXG5cbi8qKlxuICogSG9sZHMgaW5mb3JtYXRpb24gYWJvdXQgZW50cnkgcG9pbnRzIHRoYXQgYXJlIHJlbW92ZWQgYmVjYXVzZVxuICogdGhleSBoYXZlIGRlcGVuZGVuY2llcyB0aGF0IGFyZSBtaXNzaW5nIChkaXJlY3RseSBvciB0cmFuc2l0aXZlbHkpLlxuICpcbiAqIFRoaXMgbWlnaHQgbm90IGJlIGFuIGVycm9yLCBiZWNhdXNlIHN1Y2ggYW4gZW50cnkgcG9pbnQgbWlnaHQgbm90IGFjdHVhbGx5IGJlIHVzZWRcbiAqIGluIHRoZSBhcHBsaWNhdGlvbi4gSWYgaXQgaXMgdXNlZCB0aGVuIHRoZSBgbmdjYCBhcHBsaWNhdGlvbiBjb21waWxhdGlvbiB3b3VsZFxuICogZmFpbCBhbHNvLCBzbyB3ZSBkb24ndCBuZWVkIG5nY2MgdG8gY2F0Y2ggdGhpcy5cbiAqXG4gKiBGb3IgZXhhbXBsZSwgY29uc2lkZXIgYW4gYXBwbGljYXRpb24gdGhhdCB1c2VzIHRoZSBgQGFuZ3VsYXIvcm91dGVyYCBwYWNrYWdlLlxuICogVGhpcyBwYWNrYWdlIGluY2x1ZGVzIGFuIGVudHJ5LXBvaW50IGNhbGxlZCBgQGFuZ3VsYXIvcm91dGVyL3VwZ3JhZGVgLCB3aGljaCBoYXMgYSBkZXBlbmRlbmN5XG4gKiBvbiB0aGUgYEBhbmd1bGFyL3VwZ3JhZGVgIHBhY2thZ2UuXG4gKiBJZiB0aGUgYXBwbGljYXRpb24gbmV2ZXIgdXNlcyBjb2RlIGZyb20gYEBhbmd1bGFyL3JvdXRlci91cGdyYWRlYCB0aGVuIHRoZXJlIGlzIG5vIG5lZWQgZm9yXG4gKiBgQGFuZ3VsYXIvdXBncmFkZWAgdG8gYmUgaW5zdGFsbGVkLlxuICogSW4gdGhpcyBjYXNlIHRoZSBuZ2NjIHRvb2wgc2hvdWxkIGp1c3QgaWdub3JlIHRoZSBgQGFuZ3VsYXIvcm91dGVyL3VwZ3JhZGVgIGVuZC1wb2ludC5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBJbnZhbGlkRW50cnlQb2ludCB7XG4gIGVudHJ5UG9pbnQ6IEVudHJ5UG9pbnQ7XG4gIG1pc3NpbmdEZXBlbmRlbmNpZXM6IHN0cmluZ1tdO1xufVxuXG4vKipcbiAqIEhvbGRzIGluZm9ybWF0aW9uIGFib3V0IGRlcGVuZGVuY2llcyBvZiBhbiBlbnRyeS1wb2ludCB0aGF0IGRvIG5vdCBuZWVkIHRvIGJlIHByb2Nlc3NlZFxuICogYnkgdGhlIG5nY2MgdG9vbC5cbiAqXG4gKiBGb3IgZXhhbXBsZSwgdGhlIGByeGpzYCBwYWNrYWdlIGRvZXMgbm90IGNvbnRhaW4gYW55IEFuZ3VsYXIgZGVjb3JhdG9ycyB0aGF0IG5lZWQgdG8gYmVcbiAqIGNvbXBpbGVkIGFuZCBzbyB0aGlzIGNhbiBiZSBzYWZlbHkgaWdub3JlZCBieSBuZ2NjLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIElnbm9yZWREZXBlbmRlbmN5IHtcbiAgZW50cnlQb2ludDogRW50cnlQb2ludDtcbiAgZGVwZW5kZW5jeVBhdGg6IHN0cmluZztcbn1cblxuLyoqXG4gKiBBIGxpc3Qgb2YgZW50cnktcG9pbnRzLCBzb3J0ZWQgYnkgdGhlaXIgZGVwZW5kZW5jaWVzLlxuICpcbiAqIFRoZSBgZW50cnlQb2ludHNgIGFycmF5IHdpbGwgYmUgb3JkZXJlZCBzbyB0aGF0IG5vIGVudHJ5IHBvaW50IGRlcGVuZHMgdXBvbiBhbiBlbnRyeSBwb2ludCB0aGF0XG4gKiBhcHBlYXJzIGxhdGVyIGluIHRoZSBhcnJheS5cbiAqXG4gKiBTb21lIGVudHJ5IHBvaW50cyBvciB0aGVpciBkZXBlbmRlbmNpZXMgbWF5IGJlIGhhdmUgYmVlbiBpZ25vcmVkLiBUaGVzZSBhcmUgY2FwdHVyZWQgZm9yXG4gKiBkaWFnbm9zdGljIHB1cnBvc2VzIGluIGBpbnZhbGlkRW50cnlQb2ludHNgIGFuZCBgaWdub3JlZERlcGVuZGVuY2llc2AgcmVzcGVjdGl2ZWx5LlxuICovXG5leHBvcnQgaW50ZXJmYWNlIFNvcnRlZEVudHJ5UG9pbnRzSW5mbyB7XG4gIGVudHJ5UG9pbnRzOiBFbnRyeVBvaW50W107XG4gIGludmFsaWRFbnRyeVBvaW50czogSW52YWxpZEVudHJ5UG9pbnRbXTtcbiAgaWdub3JlZERlcGVuZGVuY2llczogSWdub3JlZERlcGVuZGVuY3lbXTtcbn1cblxuLyoqXG4gKiBBIGNsYXNzIHRoYXQgcmVzb2x2ZXMgZGVwZW5kZW5jaWVzIGJldHdlZW4gZW50cnktcG9pbnRzLlxuICovXG5leHBvcnQgY2xhc3MgRGVwZW5kZW5jeVJlc29sdmVyIHtcbiAgY29uc3RydWN0b3IocHJpdmF0ZSBob3N0OiBEZXBlbmRlbmN5SG9zdCkge31cbiAgLyoqXG4gICAqIFNvcnQgdGhlIGFycmF5IG9mIGVudHJ5IHBvaW50cyBzbyB0aGF0IHRoZSBkZXBlbmRhbnQgZW50cnkgcG9pbnRzIGFsd2F5cyBjb21lIGxhdGVyIHRoYW5cbiAgICogdGhlaXIgZGVwZW5kZW5jaWVzIGluIHRoZSBhcnJheS5cbiAgICogQHBhcmFtIGVudHJ5UG9pbnRzIEFuIGFycmF5IGVudHJ5IHBvaW50cyB0byBzb3J0LlxuICAgKiBAcGFyYW0gdGFyZ2V0IElmIHByb3ZpZGVkLCBvbmx5IHJldHVybiBlbnRyeS1wb2ludHMgZGVwZW5kZWQgb24gYnkgdGhpcyBlbnRyeS1wb2ludC5cbiAgICogQHJldHVybnMgdGhlIHJlc3VsdCBvZiBzb3J0aW5nIHRoZSBlbnRyeSBwb2ludHMgYnkgZGVwZW5kZW5jeS5cbiAgICovXG4gIHNvcnRFbnRyeVBvaW50c0J5RGVwZW5kZW5jeShlbnRyeVBvaW50czogRW50cnlQb2ludFtdLCB0YXJnZXQ/OiBFbnRyeVBvaW50KTpcbiAgICAgIFNvcnRlZEVudHJ5UG9pbnRzSW5mbyB7XG4gICAgY29uc3Qge2ludmFsaWRFbnRyeVBvaW50cywgaWdub3JlZERlcGVuZGVuY2llcywgZ3JhcGh9ID0gdGhpcy5jcmVhdGVEZXBlbmRlbmN5SW5mbyhlbnRyeVBvaW50cyk7XG5cbiAgICBsZXQgc29ydGVkRW50cnlQb2ludE5vZGVzOiBzdHJpbmdbXTtcbiAgICBpZiAodGFyZ2V0KSB7XG4gICAgICBzb3J0ZWRFbnRyeVBvaW50Tm9kZXMgPSBncmFwaC5kZXBlbmRlbmNpZXNPZih0YXJnZXQucGF0aCk7XG4gICAgICBzb3J0ZWRFbnRyeVBvaW50Tm9kZXMucHVzaCh0YXJnZXQucGF0aCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHNvcnRlZEVudHJ5UG9pbnROb2RlcyA9IGdyYXBoLm92ZXJhbGxPcmRlcigpO1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICBlbnRyeVBvaW50czogc29ydGVkRW50cnlQb2ludE5vZGVzLm1hcChwYXRoID0+IGdyYXBoLmdldE5vZGVEYXRhKHBhdGgpKSxcbiAgICAgIGludmFsaWRFbnRyeVBvaW50cyxcbiAgICAgIGlnbm9yZWREZXBlbmRlbmNpZXMsXG4gICAgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDb21wdXRlcyBhIGRlcGVuZGVuY3kgZ3JhcGggb2YgdGhlIGdpdmVuIGVudHJ5LXBvaW50cy5cbiAgICpcbiAgICogVGhlIGdyYXBoIG9ubHkgaG9sZHMgZW50cnktcG9pbnRzIHRoYXQgbmdjYyBjYXJlcyBhYm91dCBhbmQgd2hvc2UgZGVwZW5kZW5jaWVzXG4gICAqIChkaXJlY3QgYW5kIHRyYW5zaXRpdmUpIGFsbCBleGlzdC5cbiAgICovXG4gIHByaXZhdGUgY3JlYXRlRGVwZW5kZW5jeUluZm8oZW50cnlQb2ludHM6IEVudHJ5UG9pbnRbXSkge1xuICAgIGNvbnN0IGludmFsaWRFbnRyeVBvaW50czogSW52YWxpZEVudHJ5UG9pbnRbXSA9IFtdO1xuICAgIGNvbnN0IGlnbm9yZWREZXBlbmRlbmNpZXM6IElnbm9yZWREZXBlbmRlbmN5W10gPSBbXTtcbiAgICBjb25zdCBncmFwaCA9IG5ldyBEZXBHcmFwaDxFbnRyeVBvaW50PigpO1xuXG4gICAgLy8gQWRkIHRoZSBlbnRyeSBwb2ludHMgdG8gdGhlIGdyYXBoIGFzIG5vZGVzXG4gICAgZW50cnlQb2ludHMuZm9yRWFjaChlbnRyeVBvaW50ID0+IGdyYXBoLmFkZE5vZGUoZW50cnlQb2ludC5wYXRoLCBlbnRyeVBvaW50KSk7XG5cbiAgICAvLyBOb3cgYWRkIHRoZSBkZXBlbmRlbmNpZXMgYmV0d2VlbiB0aGVtXG4gICAgZW50cnlQb2ludHMuZm9yRWFjaChlbnRyeVBvaW50ID0+IHtcbiAgICAgIGNvbnN0IGVudHJ5UG9pbnRQYXRoID0gZ2V0RW50cnlQb2ludFBhdGgoZW50cnlQb2ludCk7XG4gICAgICBjb25zdCB7ZGVwZW5kZW5jaWVzLCBtaXNzaW5nLCBkZWVwSW1wb3J0c30gPSB0aGlzLmhvc3QuY29tcHV0ZURlcGVuZGVuY2llcyhlbnRyeVBvaW50UGF0aCk7XG5cbiAgICAgIGlmIChtaXNzaW5nLnNpemUgPiAwKSB7XG4gICAgICAgIC8vIFRoaXMgZW50cnkgcG9pbnQgaGFzIGRlcGVuZGVuY2llcyB0aGF0IGFyZSBtaXNzaW5nXG4gICAgICAgIC8vIHNvIHJlbW92ZSBpdCBmcm9tIHRoZSBncmFwaC5cbiAgICAgICAgcmVtb3ZlTm9kZXMoZW50cnlQb2ludCwgQXJyYXkuZnJvbShtaXNzaW5nKSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBkZXBlbmRlbmNpZXMuZm9yRWFjaChkZXBlbmRlbmN5UGF0aCA9PiB7XG4gICAgICAgICAgaWYgKGdyYXBoLmhhc05vZGUoZGVwZW5kZW5jeVBhdGgpKSB7XG4gICAgICAgICAgICAvLyBUaGUgZGVwZW5kZW5jeSBwYXRoIG1hcHMgdG8gYW4gZW50cnkgcG9pbnQgdGhhdCBleGlzdHMgaW4gdGhlIGdyYXBoXG4gICAgICAgICAgICAvLyBzbyBhZGQgdGhlIGRlcGVuZGVuY3kuXG4gICAgICAgICAgICBncmFwaC5hZGREZXBlbmRlbmN5KGVudHJ5UG9pbnQucGF0aCwgZGVwZW5kZW5jeVBhdGgpO1xuICAgICAgICAgIH0gZWxzZSBpZiAoaW52YWxpZEVudHJ5UG9pbnRzLnNvbWUoaSA9PiBpLmVudHJ5UG9pbnQucGF0aCA9PT0gZGVwZW5kZW5jeVBhdGgpKSB7XG4gICAgICAgICAgICAvLyBUaGUgZGVwZW5kZW5jeSBwYXRoIG1hcHMgdG8gYW4gZW50cnktcG9pbnQgdGhhdCB3YXMgcHJldmlvdXNseSByZW1vdmVkXG4gICAgICAgICAgICAvLyBmcm9tIHRoZSBncmFwaCwgc28gcmVtb3ZlIHRoaXMgZW50cnktcG9pbnQgYXMgd2VsbC5cbiAgICAgICAgICAgIHJlbW92ZU5vZGVzKGVudHJ5UG9pbnQsIFtkZXBlbmRlbmN5UGF0aF0pO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBUaGUgZGVwZW5kZW5jeSBwYXRoIHBvaW50cyB0byBhIHBhY2thZ2UgdGhhdCBuZ2NjIGRvZXMgbm90IGNhcmUgYWJvdXQuXG4gICAgICAgICAgICBpZ25vcmVkRGVwZW5kZW5jaWVzLnB1c2goe2VudHJ5UG9pbnQsIGRlcGVuZGVuY3lQYXRofSk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgaWYgKGRlZXBJbXBvcnRzLnNpemUpIHtcbiAgICAgICAgY29uc3QgaW1wb3J0cyA9IEFycmF5LmZyb20oZGVlcEltcG9ydHMpLm1hcChpID0+IGAnJHtpfSdgKS5qb2luKCcsICcpO1xuICAgICAgICBjb25zb2xlLndhcm4oXG4gICAgICAgICAgICBgRW50cnkgcG9pbnQgJyR7ZW50cnlQb2ludC5uYW1lfScgY29udGFpbnMgZGVlcCBpbXBvcnRzIGludG8gJHtpbXBvcnRzfS4gYCArXG4gICAgICAgICAgICBgVGhpcyBpcyBwcm9iYWJseSBub3QgYSBwcm9ibGVtLCBidXQgbWF5IGNhdXNlIHRoZSBjb21waWxhdGlvbiBvZiBlbnRyeSBwb2ludHMgdG8gYmUgb3V0IG9mIG9yZGVyLmApO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgcmV0dXJuIHtpbnZhbGlkRW50cnlQb2ludHMsIGlnbm9yZWREZXBlbmRlbmNpZXMsIGdyYXBofTtcblxuICAgIGZ1bmN0aW9uIHJlbW92ZU5vZGVzKGVudHJ5UG9pbnQ6IEVudHJ5UG9pbnQsIG1pc3NpbmdEZXBlbmRlbmNpZXM6IHN0cmluZ1tdKSB7XG4gICAgICBjb25zdCBub2Rlc1RvUmVtb3ZlID0gW2VudHJ5UG9pbnQucGF0aCwgLi4uZ3JhcGguZGVwZW5kYW50c09mKGVudHJ5UG9pbnQucGF0aCldO1xuICAgICAgbm9kZXNUb1JlbW92ZS5mb3JFYWNoKG5vZGUgPT4ge1xuICAgICAgICBpbnZhbGlkRW50cnlQb2ludHMucHVzaCh7ZW50cnlQb2ludDogZ3JhcGguZ2V0Tm9kZURhdGEobm9kZSksIG1pc3NpbmdEZXBlbmRlbmNpZXN9KTtcbiAgICAgICAgZ3JhcGgucmVtb3ZlTm9kZShub2RlKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBnZXRFbnRyeVBvaW50UGF0aChlbnRyeVBvaW50OiBFbnRyeVBvaW50KTogQWJzb2x1dGVGc1BhdGgge1xuICBjb25zdCBwcm9wZXJ0aWVzID0gT2JqZWN0LmtleXMoZW50cnlQb2ludC5wYWNrYWdlSnNvbik7XG4gIGZvciAobGV0IGkgPSAwOyBpIDwgcHJvcGVydGllcy5sZW5ndGg7IGkrKykge1xuICAgIGNvbnN0IHByb3BlcnR5ID0gcHJvcGVydGllc1tpXSBhcyBFbnRyeVBvaW50SnNvblByb3BlcnR5O1xuICAgIGNvbnN0IGZvcm1hdCA9IGdldEVudHJ5UG9pbnRGb3JtYXQocHJvcGVydHkpO1xuXG4gICAgaWYgKGZvcm1hdCA9PT0gJ2VzbTIwMTUnIHx8IGZvcm1hdCA9PT0gJ2VzbTUnKSB7XG4gICAgICBjb25zdCBmb3JtYXRQYXRoID0gZW50cnlQb2ludC5wYWNrYWdlSnNvbltwcm9wZXJ0eV0gITtcbiAgICAgIHJldHVybiBBYnNvbHV0ZUZzUGF0aC5mcm9tKHJlc29sdmUoZW50cnlQb2ludC5wYXRoLCBmb3JtYXRQYXRoKSk7XG4gICAgfVxuICB9XG4gIHRocm93IG5ldyBFcnJvcihgVGhlcmUgaXMgbm8gZm9ybWF0IHdpdGggaW1wb3J0IHN0YXRlbWVudHMgaW4gJyR7ZW50cnlQb2ludC5wYXRofScgZW50cnktcG9pbnQuYCk7XG59XG4iXX0=