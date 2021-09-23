/**
 * @license
 * Copyright Google LLC All Rights Reserved.
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
        define("@angular/compiler-cli/ngcc/src/dependencies/dependency_resolver", ["require", "exports", "tslib", "dependency-graph", "@angular/compiler-cli/ngcc/src/packages/entry_point", "@angular/compiler-cli/ngcc/src/dependencies/dependency_host"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.DependencyResolver = void 0;
    var tslib_1 = require("tslib");
    var dependency_graph_1 = require("dependency-graph");
    var entry_point_1 = require("@angular/compiler-cli/ngcc/src/packages/entry_point");
    var dependency_host_1 = require("@angular/compiler-cli/ngcc/src/dependencies/dependency_host");
    var builtinNodeJsModules = new Set(require('module').builtinModules);
    /**
     * A class that resolves dependencies between entry-points.
     */
    var DependencyResolver = /** @class */ (function () {
        function DependencyResolver(fs, logger, config, hosts, typingsHost) {
            this.fs = fs;
            this.logger = logger;
            this.config = config;
            this.hosts = hosts;
            this.typingsHost = typingsHost;
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
                entryPoints: sortedEntryPointNodes
                    .map(function (path) { return graph.getNodeData(path); }),
                graph: graph,
                invalidEntryPoints: invalidEntryPoints,
                ignoredDependencies: ignoredDependencies,
            };
        };
        DependencyResolver.prototype.getEntryPointWithDependencies = function (entryPoint) {
            var dependencies = (0, dependency_host_1.createDependencyInfo)();
            if (entryPoint.compiledByAngular) {
                // Only bother to compute dependencies of entry-points that have been compiled by Angular
                var formatInfo = this.getEntryPointFormatInfo(entryPoint);
                var host = this.hosts[formatInfo.format];
                if (!host) {
                    throw new Error("Could not find a suitable format for computing dependencies of entry-point: '" + entryPoint.path + "'.");
                }
                host.collectDependencies(formatInfo.path, dependencies);
                this.typingsHost.collectDependencies(entryPoint.typings, dependencies);
            }
            return { entryPoint: entryPoint, depInfo: dependencies };
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
            var angularEntryPoints = entryPoints.filter(function (e) { return e.entryPoint.compiledByAngular; });
            // Add the Angular compiled entry points to the graph as nodes
            angularEntryPoints.forEach(function (e) { return graph.addNode(e.entryPoint.path, e.entryPoint); });
            // Now add the dependencies between them
            angularEntryPoints.forEach(function (_a) {
                var entryPoint = _a.entryPoint, _b = _a.depInfo, dependencies = _b.dependencies, missing = _b.missing, deepImports = _b.deepImports;
                var missingDependencies = Array.from(missing).filter(function (dep) { return !builtinNodeJsModules.has(dep); });
                if (missingDependencies.length > 0 && !entryPoint.ignoreMissingDependencies) {
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
                if (deepImports.size > 0) {
                    var notableDeepImports = _this.filterIgnorableDeepImports(entryPoint, deepImports);
                    if (notableDeepImports.length > 0) {
                        var imports = notableDeepImports.map(function (i) { return "'" + i + "'"; }).join(', ');
                        _this.logger.warn("Entry point '" + entryPoint.name + "' contains deep imports into " + imports + ". " +
                            "This is probably not a problem, but may cause the compilation of entry points to be out of order.");
                    }
                }
            });
            return { invalidEntryPoints: invalidEntryPoints, ignoredDependencies: ignoredDependencies, graph: graph };
            function removeNodes(entryPoint, missingDependencies) {
                var nodesToRemove = (0, tslib_1.__spreadArray)([entryPoint.path], (0, tslib_1.__read)(graph.dependantsOf(entryPoint.path)), false);
                nodesToRemove.forEach(function (node) {
                    invalidEntryPoints.push({ entryPoint: graph.getNodeData(node), missingDependencies: missingDependencies });
                    graph.removeNode(node);
                });
            }
        };
        DependencyResolver.prototype.getEntryPointFormatInfo = function (entryPoint) {
            var e_1, _a;
            try {
                for (var SUPPORTED_FORMAT_PROPERTIES_1 = (0, tslib_1.__values)(entry_point_1.SUPPORTED_FORMAT_PROPERTIES), SUPPORTED_FORMAT_PROPERTIES_1_1 = SUPPORTED_FORMAT_PROPERTIES_1.next(); !SUPPORTED_FORMAT_PROPERTIES_1_1.done; SUPPORTED_FORMAT_PROPERTIES_1_1 = SUPPORTED_FORMAT_PROPERTIES_1.next()) {
                    var property = SUPPORTED_FORMAT_PROPERTIES_1_1.value;
                    var formatPath = entryPoint.packageJson[property];
                    if (formatPath === undefined)
                        continue;
                    var format = (0, entry_point_1.getEntryPointFormat)(this.fs, entryPoint, property);
                    if (format === undefined)
                        continue;
                    return { format: format, path: this.fs.resolve(entryPoint.path, formatPath) };
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
        /**
         * Filter out the deepImports that can be ignored, according to this entryPoint's config.
         */
        DependencyResolver.prototype.filterIgnorableDeepImports = function (entryPoint, deepImports) {
            var version = (entryPoint.packageJson.version || null);
            var packageConfig = this.config.getPackageConfig(entryPoint.packageName, entryPoint.packagePath, version);
            var matchers = packageConfig.ignorableDeepImportMatchers;
            return Array.from(deepImports)
                .filter(function (deepImport) { return !matchers.some(function (matcher) { return matcher.test(deepImport); }); });
        };
        return DependencyResolver;
    }());
    exports.DependencyResolver = DependencyResolver;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVwZW5kZW5jeV9yZXNvbHZlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9uZ2NjL3NyYy9kZXBlbmRlbmNpZXMvZGVwZW5kZW5jeV9yZXNvbHZlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7O0lBRUgscURBQTBDO0lBSzFDLG1GQUF1SDtJQUd2SCwrRkFBbUc7SUFFbkcsSUFBTSxvQkFBb0IsR0FBRyxJQUFJLEdBQUcsQ0FBUyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsY0FBYyxDQUFDLENBQUM7SUErRC9FOztPQUVHO0lBQ0g7UUFDRSw0QkFDWSxFQUFzQixFQUFVLE1BQWMsRUFBVSxNQUF5QixFQUNqRixLQUF3RCxFQUN4RCxXQUEyQjtZQUYzQixPQUFFLEdBQUYsRUFBRSxDQUFvQjtZQUFVLFdBQU0sR0FBTixNQUFNLENBQVE7WUFBVSxXQUFNLEdBQU4sTUFBTSxDQUFtQjtZQUNqRixVQUFLLEdBQUwsS0FBSyxDQUFtRDtZQUN4RCxnQkFBVyxHQUFYLFdBQVcsQ0FBZ0I7UUFBRyxDQUFDO1FBQzNDOzs7Ozs7V0FNRztRQUNILHdEQUEyQixHQUEzQixVQUE0QixXQUF5QyxFQUFFLE1BQW1CO1lBRWxGLElBQUEsS0FDRixJQUFJLENBQUMsc0JBQXNCLENBQUMsV0FBVyxDQUFDLEVBRHJDLGtCQUFrQix3QkFBQSxFQUFFLG1CQUFtQix5QkFBQSxFQUFFLEtBQUssV0FDVCxDQUFDO1lBRTdDLElBQUkscUJBQStCLENBQUM7WUFDcEMsSUFBSSxNQUFNLEVBQUU7Z0JBQ1YsSUFBSSxNQUFNLENBQUMsaUJBQWlCLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUU7b0JBQzFELHFCQUFxQixHQUFHLEtBQUssQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxD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RUFBRSxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFFLFVBQVUsQ0FBQyxFQUFDLENBQUM7aUJBQ3JFOzs7Ozs7Ozs7WUFFRCxNQUFNLElBQUksS0FBSyxDQUNYLG9EQUFrRCxVQUFVLENBQUMsSUFBSSxtQkFBZ0IsQ0FBQyxDQUFDO1FBQ3pGLENBQUM7UUFFRDs7V0FFRztRQUNLLHVEQUEwQixHQUFsQyxVQUFtQyxVQUFzQixFQUFFLFdBQWdDO1lBRXpGLElBQU0sT0FBTyxHQUFHLENBQUMsVUFBVSxDQUFDLFdBQVcsQ0FBQyxPQUFPLElBQUksSUFBSSxDQUFrQixDQUFDO1lBQzFFLElBQU0sYUFBYSxHQUNmLElBQUksQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLENBQUMsVUFBVSxDQUFDLFdBQVcsRUFBRSxVQUFVLENBQUMsV0FBVyxFQUFFLE9BQU8sQ0FBQyxDQUFDO1lBQzFGLElBQU0sUUFBUSxHQUFHLGFBQWEsQ0FBQywyQkFBMkIsQ0FBQztZQUMzRCxPQUFPLEtBQUssQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDO2lCQUN6QixNQUFNLENBQUMsVUFBQSxVQUFVLElBQUksT0FBQSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsVUFBQSxPQUFPLElBQUksT0FBQSxPQUFPLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxFQUF4QixDQUF3QixDQUFDLEVBQW5ELENBQW1ELENBQUMsQ0FBQztRQUNqRixDQUFDO1FBQ0gseUJBQUM7SUFBRCxDQUFDLEFBckpELElBcUpDO0lBckpZLGdEQUFrQiIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0RlcEdyYXBofSBmcm9tICdkZXBlbmRlbmN5LWdyYXBoJztcblxuaW1wb3J0IHtBYnNvbHV0ZUZzUGF0aCwgUmVhZG9ubHlGaWxlU3lzdGVtfSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvZmlsZV9zeXN0ZW0nO1xuaW1wb3J0IHtMb2dnZXJ9IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy9sb2dnaW5nJztcbmltcG9ydCB7TmdjY0NvbmZpZ3VyYXRpb259IGZyb20gJy4uL3BhY2thZ2VzL2NvbmZpZ3VyYXRpb24nO1xuaW1wb3J0IHtFbnRyeVBvaW50LCBFbnRyeVBvaW50Rm9ybWF0LCBnZXRFbnRyeVBvaW50Rm9ybWF0LCBTVVBQT1JURURfRk9STUFUX1BST1BFUlRJRVN9IGZyb20gJy4uL3BhY2thZ2VzL2VudHJ5X3BvaW50JztcbmltcG9ydCB7UGFydGlhbGx5T3JkZXJlZExpc3R9IGZyb20gJy4uL3V0aWxzJztcblxuaW1wb3J0IHtjcmVhdGVEZXBlbmRlbmN5SW5mbywgRGVwZW5kZW5jeUhvc3QsIEVudHJ5UG9pbnRXaXRoRGVwZW5kZW5jaWVzfSBmcm9tICcuL2RlcGVuZGVuY3lfaG9zdCc7XG5cbmNvbnN0IGJ1aWx0aW5Ob2RlSnNNb2R1bGVzID0gbmV3IFNldDxzdHJpbmc+KHJlcXVpcmUoJ21vZHVsZScpLmJ1aWx0aW5Nb2R1bGVzKTtcblxuLyoqXG4gKiBIb2xkcyBpbmZvcm1hdGlvbiBhYm91dCBlbnRyeSBwb2ludHMgdGhhdCBhcmUgcmVtb3ZlZCBiZWNhdXNlXG4gKiB0aGV5IGhhdmUgZGVwZW5kZW5jaWVzIHRoYXQgYXJlIG1pc3NpbmcgKGRpcmVjdGx5IG9yIHRyYW5zaXRpdmVseSkuXG4gKlxuICogVGhpcyBtaWdodCBub3QgYmUgYW4gZXJyb3IsIGJlY2F1c2Ugc3VjaCBhbiBlbnRyeSBwb2ludCBtaWdodCBub3QgYWN0dWFsbHkgYmUgdXNlZFxuICogaW4gdGhlIGFwcGxpY2F0aW9uLiBJZiBpdCBpcyB1c2VkIHRoZW4gdGhlIGBuZ2NgIGFwcGxpY2F0aW9uIGNvbXBpbGF0aW9uIHdvdWxkXG4gKiBmYWlsIGFsc28sIHNvIHdlIGRvbid0IG5lZWQgbmdjYyB0byBjYXRjaCB0aGlzLlxuICpcbiAqIEZvciBleGFtcGxlLCBjb25zaWRlciBhbiBhcHBsaWNhdGlvbiB0aGF0IHVzZXMgdGhlIGBAYW5ndWxhci9yb3V0ZXJgIHBhY2thZ2UuXG4gKiBUaGlzIHBhY2thZ2UgaW5jbHVkZXMgYW4gZW50cnktcG9pbnQgY2FsbGVkIGBAYW5ndWxhci9yb3V0ZXIvdXBncmFkZWAsIHdoaWNoIGhhcyBhIGRlcGVuZGVuY3lcbiAqIG9uIHRoZSBgQGFuZ3VsYXIvdXBncmFkZWAgcGFja2FnZS5cbiAqIElmIHRoZSBhcHBsaWNhdGlvbiBuZXZlciB1c2VzIGNvZGUgZnJvbSBgQGFuZ3VsYXIvcm91dGVyL3VwZ3JhZGVgIHRoZW4gdGhlcmUgaXMgbm8gbmVlZCBmb3JcbiAqIGBAYW5ndWxhci91cGdyYWRlYCB0byBiZSBpbnN0YWxsZWQuXG4gKiBJbiB0aGlzIGNhc2UgdGhlIG5nY2MgdG9vbCBzaG91bGQganVzdCBpZ25vcmUgdGhlIGBAYW5ndWxhci9yb3V0ZXIvdXBncmFkZWAgZW5kLXBvaW50LlxuICovXG5leHBvcnQgaW50ZXJmYWNlIEludmFsaWRFbnRyeVBvaW50IHtcbiAgZW50cnlQb2ludDogRW50cnlQb2ludDtcbiAgbWlzc2luZ0RlcGVuZGVuY2llczogc3RyaW5nW107XG59XG5cbi8qKlxuICogSG9sZHMgaW5mb3JtYXRpb24gYWJvdXQgZGVwZW5kZW5jaWVzIG9mIGFuIGVudHJ5LXBvaW50IHRoYXQgZG8gbm90IG5lZWQgdG8gYmUgcHJvY2Vzc2VkXG4gKiBieSB0aGUgbmdjYyB0b29sLlxuICpcbiAqIEZvciBleGFtcGxlLCB0aGUgYHJ4anNgIHBhY2thZ2UgZG9lcyBub3QgY29udGFpbiBhbnkgQW5ndWxhciBkZWNvcmF0b3JzIHRoYXQgbmVlZCB0byBiZVxuICogY29tcGlsZWQgYW5kIHNvIHRoaXMgY2FuIGJlIHNhZmVseSBpZ25vcmVkIGJ5IG5nY2MuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgSWdub3JlZERlcGVuZGVuY3kge1xuICBlbnRyeVBvaW50OiBFbnRyeVBvaW50O1xuICBkZXBlbmRlbmN5UGF0aDogc3RyaW5nO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIERlcGVuZGVuY3lEaWFnbm9zdGljcyB7XG4gIGludmFsaWRFbnRyeVBvaW50czogSW52YWxpZEVudHJ5UG9pbnRbXTtcbiAgaWdub3JlZERlcGVuZGVuY2llczogSWdub3JlZERlcGVuZGVuY3lbXTtcbn1cblxuLyoqXG4gKiBSZXByZXNlbnRzIGEgcGFydGlhbGx5IG9yZGVyZWQgbGlzdCBvZiBlbnRyeS1wb2ludHMuXG4gKlxuICogVGhlIGVudHJ5LXBvaW50cycgb3JkZXIvcHJlY2VkZW5jZSBpcyBzdWNoIHRoYXQgZGVwZW5kZW50IGVudHJ5LXBvaW50cyBhbHdheXMgY29tZSBsYXRlciB0aGFuXG4gKiB0aGVpciBkZXBlbmRlbmNpZXMgaW4gdGhlIGxpc3QuXG4gKlxuICogU2VlIGBEZXBlbmRlbmN5UmVzb2x2ZXIjc29ydEVudHJ5UG9pbnRzQnlEZXBlbmRlbmN5KClgLlxuICovXG5leHBvcnQgdHlwZSBQYXJ0aWFsbHlPcmRlcmVkRW50cnlQb2ludHMgPSBQYXJ0aWFsbHlPcmRlcmVkTGlzdDxFbnRyeVBvaW50PjtcblxuLyoqXG4gKiBBIGxpc3Qgb2YgZW50cnktcG9pbnRzLCBzb3J0ZWQgYnkgdGhlaXIgZGVwZW5kZW5jaWVzLCBhbmQgdGhlIGRlcGVuZGVuY3kgZ3JhcGguXG4gKlxuICogVGhlIGBlbnRyeVBvaW50c2AgYXJyYXkgd2lsbCBiZSBvcmRlcmVkIHNvIHRoYXQgbm8gZW50cnkgcG9pbnQgZGVwZW5kcyB1cG9uIGFuIGVudHJ5IHBvaW50IHRoYXRcbiAqIGFwcGVhcnMgbGF0ZXIgaW4gdGhlIGFycmF5LlxuICpcbiAqIFNvbWUgZW50cnkgcG9pbnRzIG9yIHRoZWlyIGRlcGVuZGVuY2llcyBtYXkgaGF2ZSBiZWVuIGlnbm9yZWQuIFRoZXNlIGFyZSBjYXB0dXJlZCBmb3JcbiAqIGRpYWdub3N0aWMgcHVycG9zZXMgaW4gYGludmFsaWRFbnRyeVBvaW50c2AgYW5kIGBpZ25vcmVkRGVwZW5kZW5jaWVzYCByZXNwZWN0aXZlbHkuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgU29ydGVkRW50cnlQb2ludHNJbmZvIGV4dGVuZHMgRGVwZW5kZW5jeURpYWdub3N0aWNzIHtcbiAgZW50cnlQb2ludHM6IFBhcnRpYWxseU9yZGVyZWRFbnRyeVBvaW50cztcbiAgZ3JhcGg6IERlcEdyYXBoPEVudHJ5UG9pbnQ+O1xufVxuXG4vKipcbiAqIEEgY2xhc3MgdGhhdCByZXNvbHZlcyBkZXBlbmRlbmNpZXMgYmV0d2VlbiBlbnRyeS1wb2ludHMuXG4gKi9cbmV4cG9ydCBjbGFzcyBEZXBlbmRlbmN5UmVzb2x2ZXIge1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgZnM6IFJlYWRvbmx5RmlsZVN5c3RlbSwgcHJpdmF0ZSBsb2dnZXI6IExvZ2dlciwgcHJpdmF0ZSBjb25maWc6IE5nY2NDb25maWd1cmF0aW9uLFxuICAgICAgcHJpdmF0ZSBob3N0czogUGFydGlhbDxSZWNvcmQ8RW50cnlQb2ludEZvcm1hdCwgRGVwZW5kZW5jeUhvc3Q+PixcbiAgICAgIHByaXZhdGUgdHlwaW5nc0hvc3Q6IERlcGVuZGVuY3lIb3N0KSB7fVxuICAvKipcbiAgICogU29ydCB0aGUgYXJyYXkgb2YgZW50cnkgcG9pbnRzIHNvIHRoYXQgdGhlIGRlcGVuZGFudCBlbnRyeSBwb2ludHMgYWx3YXlzIGNvbWUgbGF0ZXIgdGhhblxuICAgKiB0aGVpciBkZXBlbmRlbmNpZXMgaW4gdGhlIGFycmF5LlxuICAgKiBAcGFyYW0gZW50cnlQb2ludHMgQW4gYXJyYXkgZW50cnkgcG9pbnRzIHRvIHNvcnQuXG4gICAqIEBwYXJhbSB0YXJnZXQgSWYgcHJvdmlkZWQsIG9ubHkgcmV0dXJuIGVudHJ5LXBvaW50cyBkZXBlbmRlZCBvbiBieSB0aGlzIGVudHJ5LXBvaW50LlxuICAgKiBAcmV0dXJucyB0aGUgcmVzdWx0IG9mIHNvcnRpbmcgdGhlIGVudHJ5IHBvaW50cyBieSBkZXBlbmRlbmN5LlxuICAgKi9cbiAgc29ydEVudHJ5UG9pbnRzQnlEZXBlbmRlbmN5KGVudHJ5UG9pbnRzOiBFbnRyeVBvaW50V2l0aERlcGVuZGVuY2llc1tdLCB0YXJnZXQ/OiBFbnRyeVBvaW50KTpcbiAgICAgIFNvcnRlZEVudHJ5UG9pbnRzSW5mbyB7XG4gICAgY29uc3Qge2ludmFsaWRFbnRyeVBvaW50cywgaWdub3JlZERlcGVuZGVuY2llcywgZ3JhcGh9ID1cbiAgICAgICAgdGhpcy5jb21wdXRlRGVwZW5kZW5jeUdyYXBoKGVudHJ5UG9pbnRzKTtcblxuICAgIGxldCBzb3J0ZWRFbnRyeVBvaW50Tm9kZXM6IHN0cmluZ1tdO1xuICAgIGlmICh0YXJnZXQpIHtcbiAgICAgIGlmICh0YXJnZXQuY29tcGlsZWRCeUFuZ3VsYXIgJiYgZ3JhcGguaGFzTm9kZSh0YXJnZXQucGF0aCkpIHtcbiAgICAgICAgc29ydGVkRW50cnlQb2ludE5vZGVzID0gZ3JhcGguZGVwZW5kZW5jaWVzT2YodGFyZ2V0LnBhdGgpO1xuICAgICAgICBzb3J0ZWRFbnRyeVBvaW50Tm9kZXMucHVzaCh0YXJnZXQucGF0aCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzb3J0ZWRFbnRyeVBvaW50Tm9kZXMgPSBbXTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgc29ydGVkRW50cnlQb2ludE5vZGVzID0gZ3JhcGgub3ZlcmFsbE9yZGVyKCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIGVudHJ5UG9pbnRzOiAoc29ydGVkRW50cnlQb2ludE5vZGVzIGFzIFBhcnRpYWxseU9yZGVyZWRMaXN0PHN0cmluZz4pXG4gICAgICAgICAgICAgICAgICAgICAgIC5tYXAocGF0aCA9PiBncmFwaC5nZXROb2RlRGF0YShwYXRoKSksXG4gICAgICBncmFwaCxcbiAgICAgIGludmFsaWRFbnRyeVBvaW50cyxcbiAgICAgIGlnbm9yZWREZXBlbmRlbmNpZXMsXG4gICAgfTtcbiAgfVxuXG4gIGdldEVudHJ5UG9pbnRXaXRoRGVwZW5kZW5jaWVzKGVudHJ5UG9pbnQ6IEVudHJ5UG9pbnQpOiBFbnRyeVBvaW50V2l0aERlcGVuZGVuY2llcyB7XG4gICAgY29uc3QgZGVwZW5kZW5jaWVzID0gY3JlYXRlRGVwZW5kZW5jeUluZm8oKTtcbiAgICBpZiAoZW50cnlQb2ludC5jb21waWxlZEJ5QW5ndWxhcikge1xuICAgICAgLy8gT25seSBib3RoZXIgdG8gY29tcHV0ZSBkZXBlbmRlbmNpZXMgb2YgZW50cnktcG9pbnRzIHRoYXQgaGF2ZSBiZWVuIGNvbXBpbGVkIGJ5IEFuZ3VsYXJcbiAgICAgIGNvbnN0IGZvcm1hdEluZm8gPSB0aGlzLmdldEVudHJ5UG9pbnRGb3JtYXRJbmZvKGVudHJ5UG9pbnQpO1xuICAgICAgY29uc3QgaG9zdCA9IHRoaXMuaG9zdHNbZm9ybWF0SW5mby5mb3JtYXRdO1xuICAgICAgaWYgKCFob3N0KSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICAgIGBDb3VsZCBub3QgZmluZCBhIHN1aXRhYmxlIGZvcm1hdCBmb3IgY29tcHV0aW5nIGRlcGVuZGVuY2llcyBvZiBlbnRyeS1wb2ludDogJyR7XG4gICAgICAgICAgICAgICAgZW50cnlQb2ludC5wYXRofScuYCk7XG4gICAgICB9XG4gICAgICBob3N0LmNvbGxlY3REZXBlbmRlbmNpZXMoZm9ybWF0SW5mby5wYXRoLCBkZXBlbmRlbmNpZXMpO1xuICAgICAgdGhpcy50eXBpbmdzSG9zdC5jb2xsZWN0RGVwZW5kZW5jaWVzKGVudHJ5UG9pbnQudHlwaW5ncywgZGVwZW5kZW5jaWVzKTtcbiAgICB9XG4gICAgcmV0dXJuIHtlbnRyeVBvaW50LCBkZXBJbmZvOiBkZXBlbmRlbmNpZXN9O1xuICB9XG5cbiAgLyoqXG4gICAqIENvbXB1dGVzIGEgZGVwZW5kZW5jeSBncmFwaCBvZiB0aGUgZ2l2ZW4gZW50cnktcG9pbnRzLlxuICAgKlxuICAgKiBUaGUgZ3JhcGggb25seSBob2xkcyBlbnRyeS1wb2ludHMgdGhhdCBuZ2NjIGNhcmVzIGFib3V0IGFuZCB3aG9zZSBkZXBlbmRlbmNpZXNcbiAgICogKGRpcmVjdCBhbmQgdHJhbnNpdGl2ZSkgYWxsIGV4aXN0LlxuICAgKi9cbiAgcHJpdmF0ZSBjb21wdXRlRGVwZW5kZW5jeUdyYXBoKGVudHJ5UG9pbnRzOiBFbnRyeVBvaW50V2l0aERlcGVuZGVuY2llc1tdKTogRGVwZW5kZW5jeUdyYXBoIHtcbiAgICBjb25zdCBpbnZhbGlkRW50cnlQb2ludHM6IEludmFsaWRFbnRyeVBvaW50W10gPSBbXTtcbiAgICBjb25zdCBpZ25vcmVkRGVwZW5kZW5jaWVzOiBJZ25vcmVkRGVwZW5kZW5jeVtdID0gW107XG4gICAgY29uc3QgZ3JhcGggPSBuZXcgRGVwR3JhcGg8RW50cnlQb2ludD4oKTtcblxuICAgIGNvbnN0IGFuZ3VsYXJFbnRyeVBvaW50cyA9IGVudHJ5UG9pbnRzLmZpbHRlcihlID0+IGUuZW50cnlQb2ludC5jb21waWxlZEJ5QW5ndWxhcik7XG5cbiAgICAvLyBBZGQgdGhlIEFuZ3VsYXIgY29tcGlsZWQgZW50cnkgcG9pbnRzIHRvIHRoZSBncmFwaCBhcyBub2Rlc1xuICAgIGFuZ3VsYXJFbnRyeVBvaW50cy5mb3JFYWNoKGUgPT4gZ3JhcGguYWRkTm9kZShlLmVudHJ5UG9pbnQucGF0aCwgZS5lbnRyeVBvaW50KSk7XG5cbiAgICAvLyBOb3cgYWRkIHRoZSBkZXBlbmRlbmNpZXMgYmV0d2VlbiB0aGVtXG4gICAgYW5ndWxhckVudHJ5UG9pbnRzLmZvckVhY2goKHtlbnRyeVBvaW50LCBkZXBJbmZvOiB7ZGVwZW5kZW5jaWVzLCBtaXNzaW5nLCBkZWVwSW1wb3J0c319KSA9PiB7XG4gICAgICBjb25zdCBtaXNzaW5nRGVwZW5kZW5jaWVzID0gQXJyYXkuZnJvbShtaXNzaW5nKS5maWx0ZXIoZGVwID0+ICFidWlsdGluTm9kZUpzTW9kdWxlcy5oYXMoZGVwKSk7XG5cbiAgICAgIGlmIChtaXNzaW5nRGVwZW5kZW5jaWVzLmxlbmd0aCA+IDAgJiYgIWVudHJ5UG9pbnQuaWdub3JlTWlzc2luZ0RlcGVuZGVuY2llcykge1xuICAgICAgICAvLyBUaGlzIGVudHJ5IHBvaW50IGhhcyBkZXBlbmRlbmNpZXMgdGhhdCBhcmUgbWlzc2luZ1xuICAgICAgICAvLyBzbyByZW1vdmUgaXQgZnJvbSB0aGUgZ3JhcGguXG4gICAgICAgIHJlbW92ZU5vZGVzKGVudHJ5UG9pbnQsIG1pc3NpbmdEZXBlbmRlbmNpZXMpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZGVwZW5kZW5jaWVzLmZvckVhY2goZGVwZW5kZW5jeVBhdGggPT4ge1xuICAgICAgICAgIGlmICghZ3JhcGguaGFzTm9kZShlbnRyeVBvaW50LnBhdGgpKSB7XG4gICAgICAgICAgICAvLyBUaGUgZW50cnktcG9pbnQgaGFzIGFscmVhZHkgYmVlbiBpZGVudGlmaWVkIGFzIGludmFsaWQgc28gd2UgZG9uJ3QgbmVlZFxuICAgICAgICAgICAgLy8gdG8gZG8gYW55IGZ1cnRoZXIgd29yayBvbiBpdC5cbiAgICAgICAgICB9IGVsc2UgaWYgKGdyYXBoLmhhc05vZGUoZGVwZW5kZW5jeVBhdGgpKSB7XG4gICAgICAgICAgICAvLyBUaGUgZW50cnktcG9pbnQgaXMgc3RpbGwgdmFsaWQgKGkuZS4gaGFzIG5vIG1pc3NpbmcgZGVwZW5kZW5jaWVzKSBhbmRcbiAgICAgICAgICAgIC8vIHRoZSBkZXBlbmRlbmN5IG1hcHMgdG8gYW4gZW50cnkgcG9pbnQgdGhhdCBleGlzdHMgaW4gdGhlIGdyYXBoIHNvIGFkZCBpdFxuICAgICAgICAgICAgZ3JhcGguYWRkRGVwZW5kZW5jeShlbnRyeVBvaW50LnBhdGgsIGRlcGVuZGVuY3lQYXRoKTtcbiAgICAgICAgICB9IGVsc2UgaWYgKGludmFsaWRFbnRyeVBvaW50cy5zb21lKGkgPT4gaS5lbnRyeVBvaW50LnBhdGggPT09IGRlcGVuZGVuY3lQYXRoKSkge1xuICAgICAgICAgICAgLy8gVGhlIGRlcGVuZGVuY3kgcGF0aCBtYXBzIHRvIGFuIGVudHJ5LXBvaW50IHRoYXQgd2FzIHByZXZpb3VzbHkgcmVtb3ZlZFxuICAgICAgICAgICAgLy8gZnJvbSB0aGUgZ3JhcGgsIHNvIHJlbW92ZSB0aGlzIGVudHJ5LXBvaW50IGFzIHdlbGwuXG4gICAgICAgICAgICByZW1vdmVOb2RlcyhlbnRyeVBvaW50LCBbZGVwZW5kZW5jeVBhdGhdKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gVGhlIGRlcGVuZGVuY3kgcGF0aCBwb2ludHMgdG8gYSBwYWNrYWdlIHRoYXQgbmdjYyBkb2VzIG5vdCBjYXJlIGFib3V0LlxuICAgICAgICAgICAgaWdub3JlZERlcGVuZGVuY2llcy5wdXNoKHtlbnRyeVBvaW50LCBkZXBlbmRlbmN5UGF0aH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIGlmIChkZWVwSW1wb3J0cy5zaXplID4gMCkge1xuICAgICAgICBjb25zdCBub3RhYmxlRGVlcEltcG9ydHMgPSB0aGlzLmZpbHRlcklnbm9yYWJsZURlZXBJbXBvcnRzKGVudHJ5UG9pbnQsIGRlZXBJbXBvcnRzKTtcbiAgICAgICAgaWYgKG5vdGFibGVEZWVwSW1wb3J0cy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgY29uc3QgaW1wb3J0cyA9IG5vdGFibGVEZWVwSW1wb3J0cy5tYXAoaSA9PiBgJyR7aX0nYCkuam9pbignLCAnKTtcbiAgICAgICAgICB0aGlzLmxvZ2dlci53YXJuKFxuICAgICAgICAgICAgICBgRW50cnkgcG9pbnQgJyR7ZW50cnlQb2ludC5uYW1lfScgY29udGFpbnMgZGVlcCBpbXBvcnRzIGludG8gJHtpbXBvcnRzfS4gYCArXG4gICAgICAgICAgICAgIGBUaGlzIGlzIHByb2JhYmx5IG5vdCBhIHByb2JsZW0sIGJ1dCBtYXkgY2F1c2UgdGhlIGNvbXBpbGF0aW9uIG9mIGVudHJ5IHBvaW50cyB0byBiZSBvdXQgb2Ygb3JkZXIuYCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcblxuICAgIHJldHVybiB7aW52YWxpZEVudHJ5UG9pbnRzLCBpZ25vcmVkRGVwZW5kZW5jaWVzLCBncmFwaH07XG5cbiAgICBmdW5jdGlvbiByZW1vdmVOb2RlcyhlbnRyeVBvaW50OiBFbnRyeVBvaW50LCBtaXNzaW5nRGVwZW5kZW5jaWVzOiBzdHJpbmdbXSkge1xuICAgICAgY29uc3Qgbm9kZXNUb1JlbW92ZSA9IFtlbnRyeVBvaW50LnBhdGgsIC4uLmdyYXBoLmRlcGVuZGFudHNPZihlbnRyeVBvaW50LnBhdGgpXTtcbiAgICAgIG5vZGVzVG9SZW1vdmUuZm9yRWFjaChub2RlID0+IHtcbiAgICAgICAgaW52YWxpZEVudHJ5UG9pbnRzLnB1c2goe2VudHJ5UG9pbnQ6IGdyYXBoLmdldE5vZGVEYXRhKG5vZGUpLCBtaXNzaW5nRGVwZW5kZW5jaWVzfSk7XG4gICAgICAgIGdyYXBoLnJlbW92ZU5vZGUobm9kZSk7XG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGdldEVudHJ5UG9pbnRGb3JtYXRJbmZvKGVudHJ5UG9pbnQ6IEVudHJ5UG9pbnQpOlxuICAgICAge2Zvcm1hdDogRW50cnlQb2ludEZvcm1hdCwgcGF0aDogQWJzb2x1dGVGc1BhdGh9IHtcbiAgICBmb3IgKGNvbnN0IHByb3BlcnR5IG9mIFNVUFBPUlRFRF9GT1JNQVRfUFJPUEVSVElFUykge1xuICAgICAgY29uc3QgZm9ybWF0UGF0aCA9IGVudHJ5UG9pbnQucGFja2FnZUpzb25bcHJvcGVydHldO1xuICAgICAgaWYgKGZvcm1hdFBhdGggPT09IHVuZGVmaW5lZCkgY29udGludWU7XG5cbiAgICAgIGNvbnN0IGZvcm1hdCA9IGdldEVudHJ5UG9pbnRGb3JtYXQodGhpcy5mcywgZW50cnlQb2ludCwgcHJvcGVydHkpO1xuICAgICAgaWYgKGZvcm1hdCA9PT0gdW5kZWZpbmVkKSBjb250aW51ZTtcblxuICAgICAgcmV0dXJuIHtmb3JtYXQsIHBhdGg6IHRoaXMuZnMucmVzb2x2ZShlbnRyeVBvaW50LnBhdGgsIGZvcm1hdFBhdGgpfTtcbiAgICB9XG5cbiAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgIGBUaGVyZSBpcyBubyBhcHByb3ByaWF0ZSBzb3VyY2UgY29kZSBmb3JtYXQgaW4gJyR7ZW50cnlQb2ludC5wYXRofScgZW50cnktcG9pbnQuYCk7XG4gIH1cblxuICAvKipcbiAgICogRmlsdGVyIG91dCB0aGUgZGVlcEltcG9ydHMgdGhhdCBjYW4gYmUgaWdub3JlZCwgYWNjb3JkaW5nIHRvIHRoaXMgZW50cnlQb2ludCdzIGNvbmZpZy5cbiAgICovXG4gIHByaXZhdGUgZmlsdGVySWdub3JhYmxlRGVlcEltcG9ydHMoZW50cnlQb2ludDogRW50cnlQb2ludCwgZGVlcEltcG9ydHM6IFNldDxBYnNvbHV0ZUZzUGF0aD4pOlxuICAgICAgQWJzb2x1dGVGc1BhdGhbXSB7XG4gICAgY29uc3QgdmVyc2lvbiA9IChlbnRyeVBvaW50LnBhY2thZ2VKc29uLnZlcnNpb24gfHwgbnVsbCkgYXMgc3RyaW5nIHwgbnVsbDtcbiAgICBjb25zdCBwYWNrYWdlQ29uZmlnID1cbiAgICAgICAgdGhpcy5jb25maWcuZ2V0UGFja2FnZUNvbmZpZyhlbnRyeVBvaW50LnBhY2thZ2VOYW1lLCBlbnRyeVBvaW50LnBhY2thZ2VQYXRoLCB2ZXJzaW9uKTtcbiAgICBjb25zdCBtYXRjaGVycyA9IHBhY2thZ2VDb25maWcuaWdub3JhYmxlRGVlcEltcG9ydE1hdGNoZXJzO1xuICAgIHJldHVybiBBcnJheS5mcm9tKGRlZXBJbXBvcnRzKVxuICAgICAgICAuZmlsdGVyKGRlZXBJbXBvcnQgPT4gIW1hdGNoZXJzLnNvbWUobWF0Y2hlciA9PiBtYXRjaGVyLnRlc3QoZGVlcEltcG9ydCkpKTtcbiAgfVxufVxuXG5pbnRlcmZhY2UgRGVwZW5kZW5jeUdyYXBoIGV4dGVuZHMgRGVwZW5kZW5jeURpYWdub3N0aWNzIHtcbiAgZ3JhcGg6IERlcEdyYXBoPEVudHJ5UG9pbnQ+O1xufVxuIl19