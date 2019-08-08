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
    var builtinNodeJsModules = new Set(require('module').builtinModules);
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
                if (target.compiledByAngular && graph.hasNode(target.path)) {
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
        DependencyResolver.prototype.getEntryPointDependencies = function (entryPoint) {
            var formatInfo = this.getEntryPointFormatInfo(entryPoint);
            var host = this.hosts[formatInfo.format];
            if (!host) {
                throw new Error("Could not find a suitable format for computing dependencies of entry-point: '" + entryPoint.path + "'.");
            }
            return host.findDependencies(formatInfo.path);
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
                var _a = _this.getEntryPointDependencies(entryPoint), dependencies = _a.dependencies, missing = _a.missing, deepImports = _a.deepImports;
                var missingDependencies = Array.from(missing).filter(function (dep) { return !builtinNodeJsModules.has(dep); });
                if (missingDependencies.length > 0) {
                    // This entry point has dependencies that are missing
                    // so remove it from the graph.
                    removeNodes(entryPoint, missingDependencies);
                }
                else {
                    dependencies.forEach(function (dependencyPath) {
                        if (!graph.hasNode(entryPoint.path)) {
                            // The entry-point has already been identified as invalid so we don't need
                            // to do any further work on it.
                        }
                        else if (graph.hasNode(dependencyPath)) {
                            // The entry-point is still valid (i.e. has no missing dependencies) and
                            // the dependency maps to an entry point that exists in the graph so add it
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
        DependencyResolver.prototype.getEntryPointFormatInfo = function (entryPoint) {
            var e_1, _a;
            try {
                for (var SUPPORTED_FORMAT_PROPERTIES_1 = tslib_1.__values(entry_point_1.SUPPORTED_FORMAT_PROPERTIES), SUPPORTED_FORMAT_PROPERTIES_1_1 = SUPPORTED_FORMAT_PROPERTIES_1.next(); !SUPPORTED_FORMAT_PROPERTIES_1_1.done; SUPPORTED_FORMAT_PROPERTIES_1_1 = SUPPORTED_FORMAT_PROPERTIES_1.next()) {
                    var property = SUPPORTED_FORMAT_PROPERTIES_1_1.value;
                    var formatPath = entryPoint.packageJson[property];
                    if (formatPath === undefined)
                        continue;
                    var format = entry_point_1.getEntryPointFormat(this.fs, entryPoint, property);
                    if (format === undefined)
                        continue;
                    return { format: format, path: file_system_1.resolve(entryPoint.path, formatPath) };
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (SUPPORTED_FORMAT_PROPERTIES_1_1 && !SUPPORTED_FORMAT_PROPERTIES_1_1.done && (_a = SUPPORTED_FORMAT_PROPERTIES_1.return)) _a.call(SUPPORTED_FORMAT_PROPERTIES_1);
                }
                finally { if (e_1) throw e_1.error; }
            }
            throw new Error("There is no appropriate source code format in '" + entryPoint.path + "' entry-point.");
        };
        return DependencyResolver;
    }());
    exports.DependencyResolver = DependencyResolver;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVwZW5kZW5jeV9yZXNvbHZlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9uZ2NjL3NyYy9kZXBlbmRlbmNpZXMvZGVwZW5kZW5jeV9yZXNvbHZlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFFSCxxREFBMEM7SUFDMUMsMkVBQW1GO0lBRW5GLG1GQUErSTtJQUcvSSxJQUFNLG9CQUFvQixHQUFHLElBQUksR0FBRyxDQUFTLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxjQUFjLENBQUMsQ0FBQztJQWtEL0U7O09BRUc7SUFDSDtRQUNFLDRCQUNZLEVBQWMsRUFBVSxNQUFjLEVBQ3RDLEtBQXdEO1lBRHhELE9BQUUsR0FBRixFQUFFLENBQVk7WUFBVSxXQUFNLEdBQU4sTUFBTSxDQUFRO1lBQ3RDLFVBQUssR0FBTCxLQUFLLENBQW1EO1FBQUcsQ0FBQztRQUN4RTs7Ozs7O1dBTUc7UUFDSCx3REFBMkIsR0FBM0IsVUFBNEIsV0FBeUIsRUFBRSxNQUFtQjtZQUVsRSxJQUFBLDZDQUNzQyxFQURyQywwQ0FBa0IsRUFBRSw0Q0FBbUIsRUFBRSxnQkFDSixDQUFDO1lBRTdDLElBQUkscUJBQStCLENBQUM7WUFDcEMsSUFBSSxNQUFNLEVBQUU7Z0JBQ1YsSUFBSSxNQUFNLENBQUMsaUJBQWlCLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUU7b0JBQzFELHFCQUFxQixHQUFHLEtBQUssQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO29CQUMxRCxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO2lCQUN6QztxQkFBTTtvQkFDTCxxQkFBcUIsR0FBRyxFQUFFLENBQUM7aUJBQzVCO2FBQ0Y7aUJBQU07Z0JBQ0wscUJB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QXVCLElBQUEsZ0NBQUEsaUJBQUEseUNBQTJCLENBQUEsd0VBQUEsaUhBQUU7b0JBQS9DLElBQU0sUUFBUSx3Q0FBQTtvQkFDakIsSUFBTSxVQUFVLEdBQUcsVUFBVSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsQ0FBQztvQkFDcEQsSUFBSSxVQUFVLEtBQUssU0FBUzt3QkFBRSxTQUFTO29CQUV2QyxJQUFNLE1BQU0sR0FBRyxpQ0FBbUIsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLFVBQVUsRUFBRSxRQUFRLENBQUMsQ0FBQztvQkFDbEUsSUFBSSxNQUFNLEtBQUssU0FBUzt3QkFBRSxTQUFTO29CQUVuQyxPQUFPLEVBQUMsTUFBTSxRQUFBLEVBQUUsSUFBSSxFQUFFLHFCQUFPLENBQUMsVUFBVSxDQUFDLElBQUksRUFBRSxVQUFVLENBQUMsRUFBQyxDQUFDO2lCQUM3RDs7Ozs7Ozs7O1lBRUQsTUFBTSxJQUFJLEtBQUssQ0FDWCxvREFBa0QsVUFBVSxDQUFDLElBQUksbUJBQWdCLENBQUMsQ0FBQztRQUN6RixDQUFDO1FBQ0gseUJBQUM7SUFBRCxDQUFDLEFBN0hELElBNkhDO0lBN0hZLGdEQUFrQiIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtEZXBHcmFwaH0gZnJvbSAnZGVwZW5kZW5jeS1ncmFwaCc7XG5pbXBvcnQge0Fic29sdXRlRnNQYXRoLCBGaWxlU3lzdGVtLCByZXNvbHZlfSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvZmlsZV9zeXN0ZW0nO1xuaW1wb3J0IHtMb2dnZXJ9IGZyb20gJy4uL2xvZ2dpbmcvbG9nZ2VyJztcbmltcG9ydCB7RW50cnlQb2ludCwgRW50cnlQb2ludEZvcm1hdCwgRW50cnlQb2ludEpzb25Qcm9wZXJ0eSwgU1VQUE9SVEVEX0ZPUk1BVF9QUk9QRVJUSUVTLCBnZXRFbnRyeVBvaW50Rm9ybWF0fSBmcm9tICcuLi9wYWNrYWdlcy9lbnRyeV9wb2ludCc7XG5pbXBvcnQge0RlcGVuZGVuY3lIb3N0LCBEZXBlbmRlbmN5SW5mb30gZnJvbSAnLi9kZXBlbmRlbmN5X2hvc3QnO1xuXG5jb25zdCBidWlsdGluTm9kZUpzTW9kdWxlcyA9IG5ldyBTZXQ8c3RyaW5nPihyZXF1aXJlKCdtb2R1bGUnKS5idWlsdGluTW9kdWxlcyk7XG5cbi8qKlxuICogSG9sZHMgaW5mb3JtYXRpb24gYWJvdXQgZW50cnkgcG9pbnRzIHRoYXQgYXJlIHJlbW92ZWQgYmVjYXVzZVxuICogdGhleSBoYXZlIGRlcGVuZGVuY2llcyB0aGF0IGFyZSBtaXNzaW5nIChkaXJlY3RseSBvciB0cmFuc2l0aXZlbHkpLlxuICpcbiAqIFRoaXMgbWlnaHQgbm90IGJlIGFuIGVycm9yLCBiZWNhdXNlIHN1Y2ggYW4gZW50cnkgcG9pbnQgbWlnaHQgbm90IGFjdHVhbGx5IGJlIHVzZWRcbiAqIGluIHRoZSBhcHBsaWNhdGlvbi4gSWYgaXQgaXMgdXNlZCB0aGVuIHRoZSBgbmdjYCBhcHBsaWNhdGlvbiBjb21waWxhdGlvbiB3b3VsZFxuICogZmFpbCBhbHNvLCBzbyB3ZSBkb24ndCBuZWVkIG5nY2MgdG8gY2F0Y2ggdGhpcy5cbiAqXG4gKiBGb3IgZXhhbXBsZSwgY29uc2lkZXIgYW4gYXBwbGljYXRpb24gdGhhdCB1c2VzIHRoZSBgQGFuZ3VsYXIvcm91dGVyYCBwYWNrYWdlLlxuICogVGhpcyBwYWNrYWdlIGluY2x1ZGVzIGFuIGVudHJ5LXBvaW50IGNhbGxlZCBgQGFuZ3VsYXIvcm91dGVyL3VwZ3JhZGVgLCB3aGljaCBoYXMgYSBkZXBlbmRlbmN5XG4gKiBvbiB0aGUgYEBhbmd1bGFyL3VwZ3JhZGVgIHBhY2thZ2UuXG4gKiBJZiB0aGUgYXBwbGljYXRpb24gbmV2ZXIgdXNlcyBjb2RlIGZyb20gYEBhbmd1bGFyL3JvdXRlci91cGdyYWRlYCB0aGVuIHRoZXJlIGlzIG5vIG5lZWQgZm9yXG4gKiBgQGFuZ3VsYXIvdXBncmFkZWAgdG8gYmUgaW5zdGFsbGVkLlxuICogSW4gdGhpcyBjYXNlIHRoZSBuZ2NjIHRvb2wgc2hvdWxkIGp1c3QgaWdub3JlIHRoZSBgQGFuZ3VsYXIvcm91dGVyL3VwZ3JhZGVgIGVuZC1wb2ludC5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBJbnZhbGlkRW50cnlQb2ludCB7XG4gIGVudHJ5UG9pbnQ6IEVudHJ5UG9pbnQ7XG4gIG1pc3NpbmdEZXBlbmRlbmNpZXM6IHN0cmluZ1tdO1xufVxuXG4vKipcbiAqIEhvbGRzIGluZm9ybWF0aW9uIGFib3V0IGRlcGVuZGVuY2llcyBvZiBhbiBlbnRyeS1wb2ludCB0aGF0IGRvIG5vdCBuZWVkIHRvIGJlIHByb2Nlc3NlZFxuICogYnkgdGhlIG5nY2MgdG9vbC5cbiAqXG4gKiBGb3IgZXhhbXBsZSwgdGhlIGByeGpzYCBwYWNrYWdlIGRvZXMgbm90IGNvbnRhaW4gYW55IEFuZ3VsYXIgZGVjb3JhdG9ycyB0aGF0IG5lZWQgdG8gYmVcbiAqIGNvbXBpbGVkIGFuZCBzbyB0aGlzIGNhbiBiZSBzYWZlbHkgaWdub3JlZCBieSBuZ2NjLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIElnbm9yZWREZXBlbmRlbmN5IHtcbiAgZW50cnlQb2ludDogRW50cnlQb2ludDtcbiAgZGVwZW5kZW5jeVBhdGg6IHN0cmluZztcbn1cblxuZXhwb3J0IGludGVyZmFjZSBEZXBlbmRlbmN5RGlhZ25vc3RpY3Mge1xuICBpbnZhbGlkRW50cnlQb2ludHM6IEludmFsaWRFbnRyeVBvaW50W107XG4gIGlnbm9yZWREZXBlbmRlbmNpZXM6IElnbm9yZWREZXBlbmRlbmN5W107XG59XG5cbi8qKlxuICogQSBsaXN0IG9mIGVudHJ5LXBvaW50cywgc29ydGVkIGJ5IHRoZWlyIGRlcGVuZGVuY2llcy5cbiAqXG4gKiBUaGUgYGVudHJ5UG9pbnRzYCBhcnJheSB3aWxsIGJlIG9yZGVyZWQgc28gdGhhdCBubyBlbnRyeSBwb2ludCBkZXBlbmRzIHVwb24gYW4gZW50cnkgcG9pbnQgdGhhdFxuICogYXBwZWFycyBsYXRlciBpbiB0aGUgYXJyYXkuXG4gKlxuICogU29tZSBlbnRyeSBwb2ludHMgb3IgdGhlaXIgZGVwZW5kZW5jaWVzIG1heSBiZSBoYXZlIGJlZW4gaWdub3JlZC4gVGhlc2UgYXJlIGNhcHR1cmVkIGZvclxuICogZGlhZ25vc3RpYyBwdXJwb3NlcyBpbiBgaW52YWxpZEVudHJ5UG9pbnRzYCBhbmQgYGlnbm9yZWREZXBlbmRlbmNpZXNgIHJlc3BlY3RpdmVseS5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBTb3J0ZWRFbnRyeVBvaW50c0luZm8gZXh0ZW5kcyBEZXBlbmRlbmN5RGlhZ25vc3RpY3MgeyBlbnRyeVBvaW50czogRW50cnlQb2ludFtdOyB9XG5cbi8qKlxuICogQSBjbGFzcyB0aGF0IHJlc29sdmVzIGRlcGVuZGVuY2llcyBiZXR3ZWVuIGVudHJ5LXBvaW50cy5cbiAqL1xuZXhwb3J0IGNsYXNzIERlcGVuZGVuY3lSZXNvbHZlciB7XG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSBmczogRmlsZVN5c3RlbSwgcHJpdmF0ZSBsb2dnZXI6IExvZ2dlcixcbiAgICAgIHByaXZhdGUgaG9zdHM6IFBhcnRpYWw8UmVjb3JkPEVudHJ5UG9pbnRGb3JtYXQsIERlcGVuZGVuY3lIb3N0Pj4pIHt9XG4gIC8qKlxuICAgKiBTb3J0IHRoZSBhcnJheSBvZiBlbnRyeSBwb2ludHMgc28gdGhhdCB0aGUgZGVwZW5kYW50IGVudHJ5IHBvaW50cyBhbHdheXMgY29tZSBsYXRlciB0aGFuXG4gICAqIHRoZWlyIGRlcGVuZGVuY2llcyBpbiB0aGUgYXJyYXkuXG4gICAqIEBwYXJhbSBlbnRyeVBvaW50cyBBbiBhcnJheSBlbnRyeSBwb2ludHMgdG8gc29ydC5cbiAgICogQHBhcmFtIHRhcmdldCBJZiBwcm92aWRlZCwgb25seSByZXR1cm4gZW50cnktcG9pbnRzIGRlcGVuZGVkIG9uIGJ5IHRoaXMgZW50cnktcG9pbnQuXG4gICAqIEByZXR1cm5zIHRoZSByZXN1bHQgb2Ygc29ydGluZyB0aGUgZW50cnkgcG9pbnRzIGJ5IGRlcGVuZGVuY3kuXG4gICAqL1xuICBzb3J0RW50cnlQb2ludHNCeURlcGVuZGVuY3koZW50cnlQb2ludHM6IEVudHJ5UG9pbnRbXSwgdGFyZ2V0PzogRW50cnlQb2ludCk6XG4gICAgICBTb3J0ZWRFbnRyeVBvaW50c0luZm8ge1xuICAgIGNvbnN0IHtpbnZhbGlkRW50cnlQb2ludHMsIGlnbm9yZWREZXBlbmRlbmNpZXMsIGdyYXBofSA9XG4gICAgICAgIHRoaXMuY29tcHV0ZURlcGVuZGVuY3lHcmFwaChlbnRyeVBvaW50cyk7XG5cbiAgICBsZXQgc29ydGVkRW50cnlQb2ludE5vZGVzOiBzdHJpbmdbXTtcbiAgICBpZiAodGFyZ2V0KSB7XG4gICAgICBpZiAodGFyZ2V0LmNvbXBpbGVkQnlBbmd1bGFyICYmIGdyYXBoLmhhc05vZGUodGFyZ2V0LnBhdGgpKSB7XG4gICAgICAgIHNvcnRlZEVudHJ5UG9pbnROb2RlcyA9IGdyYXBoLmRlcGVuZGVuY2llc09mKHRhcmdldC5wYXRoKTtcbiAgICAgICAgc29ydGVkRW50cnlQb2ludE5vZGVzLnB1c2godGFyZ2V0LnBhdGgpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc29ydGVkRW50cnlQb2ludE5vZGVzID0gW107XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHNvcnRlZEVudHJ5UG9pbnROb2RlcyA9IGdyYXBoLm92ZXJhbGxPcmRlcigpO1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICBlbnRyeVBvaW50czogc29ydGVkRW50cnlQb2ludE5vZGVzLm1hcChwYXRoID0+IGdyYXBoLmdldE5vZGVEYXRhKHBhdGgpKSxcbiAgICAgIGludmFsaWRFbnRyeVBvaW50cyxcbiAgICAgIGlnbm9yZWREZXBlbmRlbmNpZXMsXG4gICAgfTtcbiAgfVxuXG4gIGdldEVudHJ5UG9pbnREZXBlbmRlbmNpZXMoZW50cnlQb2ludDogRW50cnlQb2ludCk6IERlcGVuZGVuY3lJbmZvIHtcbiAgICBjb25zdCBmb3JtYXRJbmZvID0gdGhpcy5nZXRFbnRyeVBvaW50Rm9ybWF0SW5mbyhlbnRyeVBvaW50KTtcbiAgICBjb25zdCBob3N0ID0gdGhpcy5ob3N0c1tmb3JtYXRJbmZvLmZvcm1hdF07XG4gICAgaWYgKCFob3N0KSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgYENvdWxkIG5vdCBmaW5kIGEgc3VpdGFibGUgZm9ybWF0IGZvciBjb21wdXRpbmcgZGVwZW5kZW5jaWVzIG9mIGVudHJ5LXBvaW50OiAnJHtlbnRyeVBvaW50LnBhdGh9Jy5gKTtcbiAgICB9XG4gICAgcmV0dXJuIGhvc3QuZmluZERlcGVuZGVuY2llcyhmb3JtYXRJbmZvLnBhdGgpO1xuICB9XG5cbiAgLyoqXG4gICAqIENvbXB1dGVzIGEgZGVwZW5kZW5jeSBncmFwaCBvZiB0aGUgZ2l2ZW4gZW50cnktcG9pbnRzLlxuICAgKlxuICAgKiBUaGUgZ3JhcGggb25seSBob2xkcyBlbnRyeS1wb2ludHMgdGhhdCBuZ2NjIGNhcmVzIGFib3V0IGFuZCB3aG9zZSBkZXBlbmRlbmNpZXNcbiAgICogKGRpcmVjdCBhbmQgdHJhbnNpdGl2ZSkgYWxsIGV4aXN0LlxuICAgKi9cbiAgcHJpdmF0ZSBjb21wdXRlRGVwZW5kZW5jeUdyYXBoKGVudHJ5UG9pbnRzOiBFbnRyeVBvaW50W10pOiBEZXBlbmRlbmN5R3JhcGgge1xuICAgIGNvbnN0IGludmFsaWRFbnRyeVBvaW50czogSW52YWxpZEVudHJ5UG9pbnRbXSA9IFtdO1xuICAgIGNvbnN0IGlnbm9yZWREZXBlbmRlbmNpZXM6IElnbm9yZWREZXBlbmRlbmN5W10gPSBbXTtcbiAgICBjb25zdCBncmFwaCA9IG5ldyBEZXBHcmFwaDxFbnRyeVBvaW50PigpO1xuXG4gICAgY29uc3QgYW5ndWxhckVudHJ5UG9pbnRzID0gZW50cnlQb2ludHMuZmlsdGVyKGVudHJ5UG9pbnQgPT4gZW50cnlQb2ludC5jb21waWxlZEJ5QW5ndWxhcik7XG5cbiAgICAvLyBBZGQgdGhlIEFuZ3VsYXIgY29tcGlsZWQgZW50cnkgcG9pbnRzIHRvIHRoZSBncmFwaCBhcyBub2Rlc1xuICAgIGFuZ3VsYXJFbnRyeVBvaW50cy5mb3JFYWNoKGVudHJ5UG9pbnQgPT4gZ3JhcGguYWRkTm9kZShlbnRyeVBvaW50LnBhdGgsIGVudHJ5UG9pbnQpKTtcblxuICAgIC8vIE5vdyBhZGQgdGhlIGRlcGVuZGVuY2llcyBiZXR3ZWVuIHRoZW1cbiAgICBhbmd1bGFyRW50cnlQb2ludHMuZm9yRWFjaChlbnRyeVBvaW50ID0+IHtcbiAgICAgIGNvbnN0IHtkZXBlbmRlbmNpZXMsIG1pc3NpbmcsIGRlZXBJbXBvcnRzfSA9IHRoaXMuZ2V0RW50cnlQb2ludERlcGVuZGVuY2llcyhlbnRyeVBvaW50KTtcblxuICAgICAgY29uc3QgbWlzc2luZ0RlcGVuZGVuY2llcyA9IEFycmF5LmZyb20obWlzc2luZykuZmlsdGVyKGRlcCA9PiAhYnVpbHRpbk5vZGVKc01vZHVsZXMuaGFzKGRlcCkpO1xuXG4gICAgICBpZiAobWlzc2luZ0RlcGVuZGVuY2llcy5sZW5ndGggPiAwKSB7XG4gICAgICAgIC8vIFRoaXMgZW50cnkgcG9pbnQgaGFzIGRlcGVuZGVuY2llcyB0aGF0IGFyZSBtaXNzaW5nXG4gICAgICAgIC8vIHNvIHJlbW92ZSBpdCBmcm9tIHRoZSBncmFwaC5cbiAgICAgICAgcmVtb3ZlTm9kZXMoZW50cnlQb2ludCwgbWlzc2luZ0RlcGVuZGVuY2llcyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBkZXBlbmRlbmNpZXMuZm9yRWFjaChkZXBlbmRlbmN5UGF0aCA9PiB7XG4gICAgICAgICAgaWYgKCFncmFwaC5oYXNOb2RlKGVudHJ5UG9pbnQucGF0aCkpIHtcbiAgICAgICAgICAgIC8vIFRoZSBlbnRyeS1wb2ludCBoYXMgYWxyZWFkeSBiZWVuIGlkZW50aWZpZWQgYXMgaW52YWxpZCBzbyB3ZSBkb24ndCBuZWVkXG4gICAgICAgICAgICAvLyB0byBkbyBhbnkgZnVydGhlciB3b3JrIG9uIGl0LlxuICAgICAgICAgIH0gZWxzZSBpZiAoZ3JhcGguaGFzTm9kZShkZXBlbmRlbmN5UGF0aCkpIHtcbiAgICAgICAgICAgIC8vIFRoZSBlbnRyeS1wb2ludCBpcyBzdGlsbCB2YWxpZCAoaS5lLiBoYXMgbm8gbWlzc2luZyBkZXBlbmRlbmNpZXMpIGFuZFxuICAgICAgICAgICAgLy8gdGhlIGRlcGVuZGVuY3kgbWFwcyB0byBhbiBlbnRyeSBwb2ludCB0aGF0IGV4aXN0cyBpbiB0aGUgZ3JhcGggc28gYWRkIGl0XG4gICAgICAgICAgICBncmFwaC5hZGREZXBlbmRlbmN5KGVudHJ5UG9pbnQucGF0aCwgZGVwZW5kZW5jeVBhdGgpO1xuICAgICAgICAgIH0gZWxzZSBpZiAoaW52YWxpZEVudHJ5UG9pbnRzLnNvbWUoaSA9PiBpLmVudHJ5UG9pbnQucGF0aCA9PT0gZGVwZW5kZW5jeVBhdGgpKSB7XG4gICAgICAgICAgICAvLyBUaGUgZGVwZW5kZW5jeSBwYXRoIG1hcHMgdG8gYW4gZW50cnktcG9pbnQgdGhhdCB3YXMgcHJldmlvdXNseSByZW1vdmVkXG4gICAgICAgICAgICAvLyBmcm9tIHRoZSBncmFwaCwgc28gcmVtb3ZlIHRoaXMgZW50cnktcG9pbnQgYXMgd2VsbC5cbiAgICAgICAgICAgIHJlbW92ZU5vZGVzKGVudHJ5UG9pbnQsIFtkZXBlbmRlbmN5UGF0aF0pO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBUaGUgZGVwZW5kZW5jeSBwYXRoIHBvaW50cyB0byBhIHBhY2thZ2UgdGhhdCBuZ2NjIGRvZXMgbm90IGNhcmUgYWJvdXQuXG4gICAgICAgICAgICBpZ25vcmVkRGVwZW5kZW5jaWVzLnB1c2goe2VudHJ5UG9pbnQsIGRlcGVuZGVuY3lQYXRofSk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgaWYgKGRlZXBJbXBvcnRzLnNpemUpIHtcbiAgICAgICAgY29uc3QgaW1wb3J0cyA9IEFycmF5LmZyb20oZGVlcEltcG9ydHMpLm1hcChpID0+IGAnJHtpfSdgKS5qb2luKCcsICcpO1xuICAgICAgICB0aGlzLmxvZ2dlci53YXJuKFxuICAgICAgICAgICAgYEVudHJ5IHBvaW50ICcke2VudHJ5UG9pbnQubmFtZX0nIGNvbnRhaW5zIGRlZXAgaW1wb3J0cyBpbnRvICR7aW1wb3J0c30uIGAgK1xuICAgICAgICAgICAgYFRoaXMgaXMgcHJvYmFibHkgbm90IGEgcHJvYmxlbSwgYnV0IG1heSBjYXVzZSB0aGUgY29tcGlsYXRpb24gb2YgZW50cnkgcG9pbnRzIHRvIGJlIG91dCBvZiBvcmRlci5gKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIHJldHVybiB7aW52YWxpZEVudHJ5UG9pbnRzLCBpZ25vcmVkRGVwZW5kZW5jaWVzLCBncmFwaH07XG5cbiAgICBmdW5jdGlvbiByZW1vdmVOb2RlcyhlbnRyeVBvaW50OiBFbnRyeVBvaW50LCBtaXNzaW5nRGVwZW5kZW5jaWVzOiBzdHJpbmdbXSkge1xuICAgICAgY29uc3Qgbm9kZXNUb1JlbW92ZSA9IFtlbnRyeVBvaW50LnBhdGgsIC4uLmdyYXBoLmRlcGVuZGFudHNPZihlbnRyeVBvaW50LnBhdGgpXTtcbiAgICAgIG5vZGVzVG9SZW1vdmUuZm9yRWFjaChub2RlID0+IHtcbiAgICAgICAgaW52YWxpZEVudHJ5UG9pbnRzLnB1c2goe2VudHJ5UG9pbnQ6IGdyYXBoLmdldE5vZGVEYXRhKG5vZGUpLCBtaXNzaW5nRGVwZW5kZW5jaWVzfSk7XG4gICAgICAgIGdyYXBoLnJlbW92ZU5vZGUobm9kZSk7XG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGdldEVudHJ5UG9pbnRGb3JtYXRJbmZvKGVudHJ5UG9pbnQ6IEVudHJ5UG9pbnQpOlxuICAgICAge2Zvcm1hdDogRW50cnlQb2ludEZvcm1hdCwgcGF0aDogQWJzb2x1dGVGc1BhdGh9IHtcbiAgICBmb3IgKGNvbnN0IHByb3BlcnR5IG9mIFNVUFBPUlRFRF9GT1JNQVRfUFJPUEVSVElFUykge1xuICAgICAgY29uc3QgZm9ybWF0UGF0aCA9IGVudHJ5UG9pbnQucGFja2FnZUpzb25bcHJvcGVydHldO1xuICAgICAgaWYgKGZvcm1hdFBhdGggPT09IHVuZGVmaW5lZCkgY29udGludWU7XG5cbiAgICAgIGNvbnN0IGZvcm1hdCA9IGdldEVudHJ5UG9pbnRGb3JtYXQodGhpcy5mcywgZW50cnlQb2ludCwgcHJvcGVydHkpO1xuICAgICAgaWYgKGZvcm1hdCA9PT0gdW5kZWZpbmVkKSBjb250aW51ZTtcblxuICAgICAgcmV0dXJuIHtmb3JtYXQsIHBhdGg6IHJlc29sdmUoZW50cnlQb2ludC5wYXRoLCBmb3JtYXRQYXRoKX07XG4gICAgfVxuXG4gICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICBgVGhlcmUgaXMgbm8gYXBwcm9wcmlhdGUgc291cmNlIGNvZGUgZm9ybWF0IGluICcke2VudHJ5UG9pbnQucGF0aH0nIGVudHJ5LXBvaW50LmApO1xuICB9XG59XG5cbmludGVyZmFjZSBEZXBlbmRlbmN5R3JhcGggZXh0ZW5kcyBEZXBlbmRlbmN5RGlhZ25vc3RpY3Mge1xuICBncmFwaDogRGVwR3JhcGg8RW50cnlQb2ludD47XG59XG4iXX0=