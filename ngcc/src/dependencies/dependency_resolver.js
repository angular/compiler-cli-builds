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
        define("@angular/compiler-cli/ngcc/src/dependencies/dependency_resolver", ["require", "exports", "tslib", "dependency-graph", "@angular/compiler-cli/src/ngtsc/file_system", "@angular/compiler-cli/ngcc/src/packages/entry_point", "@angular/compiler-cli/ngcc/src/dependencies/dependency_host"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.DependencyResolver = void 0;
    var tslib_1 = require("tslib");
    var dependency_graph_1 = require("dependency-graph");
    var file_system_1 = require("@angular/compiler-cli/src/ngtsc/file_system");
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
            var dependencies = dependency_host_1.createDependencyInfo();
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
        /**
         * Filter out the deepImports that can be ignored, according to this entryPoint's config.
         */
        DependencyResolver.prototype.filterIgnorableDeepImports = function (entryPoint, deepImports) {
            var version = (entryPoint.packageJson.version || null);
            var packageConfig = this.config.getPackageConfig(entryPoint.package, version);
            var matchers = packageConfig.ignorableDeepImportMatchers || [];
            return Array.from(deepImports)
                .filter(function (deepImport) { return !matchers.some(function (matcher) { return matcher.test(deepImport); }); });
        };
        return DependencyResolver;
    }());
    exports.DependencyResolver = DependencyResolver;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVwZW5kZW5jeV9yZXNvbHZlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9uZ2NjL3NyYy9kZXBlbmRlbmNpZXMvZGVwZW5kZW5jeV9yZXNvbHZlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7O0lBRUgscURBQTBDO0lBRTFDLDJFQUFtRjtJQUduRixtRkFBdUg7SUFHdkgsK0ZBQW1HO0lBRW5HLElBQU0sb0JBQW9CLEdBQUcsSUFBSSxHQUFHLENBQVMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxDQUFDO0lBK0QvRTs7T0FFRztJQUNIO1FBQ0UsNEJBQ1ksRUFBYyxFQUFVLE1BQWMsRUFBVSxNQUF5QixFQUN6RSxLQUF3RCxFQUN4RCxXQUEyQjtZQUYzQixPQUFFLEdBQUYsRUFBRSxDQUFZO1lBQVUsV0FBTSxHQUFOLE1BQU0sQ0FBUTtZQUFVLFdBQU0sR0FBTixNQUFNLENBQW1CO1lBQ3pFLFVBQUssR0FBTCxLQUFLLENBQW1EO1lBQ3hELGdCQUFXLEdBQVgsV0FBVyxDQUFnQjtRQUFHLENBQUM7UUFDM0M7Ozs7OztXQU1HO1FBQ0gsd0RBQTJCLEdBQTNCLFVBQTRCLFdBQXlDLEVBQUUsTUFBbUI7WUFFbEYsSUFBQSxLQUNGLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxXQUFXLENBQUMsRUFEckMsa0JBQWtCLHdCQUFBLEVBQUUsbUJBQW1CLHlCQUFBLEVBQUUsS0FBSyxXQUNULENBQUM7WUFFN0MsSUFBSSxxQkFBK0IsQ0FBQztZQUNwQyxJQUFJLE1BQU0sRUFBRTtnQkFDVixJQUFJLE1BQU0sQ0FBQyxpQkFBaUIsSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRTtvQkFDMUQscUJBQXFCLEdBQUcsS0FBSyxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMs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LFVBQVUsQ0FBQyxJQUFJLEVBQUUsVUFBVSxDQUFDLEVBQUMsQ0FBQztpQkFDN0Q7Ozs7Ozs7OztZQUVELE1BQU0sSUFBSSxLQUFLLENBQ1gsb0RBQWtELFVBQVUsQ0FBQyxJQUFJLG1CQUFnQixDQUFDLENBQUM7UUFDekYsQ0FBQztRQUVEOztXQUVHO1FBQ0ssdURBQTBCLEdBQWxDLFVBQW1DLFVBQXNCLEVBQUUsV0FBZ0M7WUFFekYsSUFBTSxPQUFPLEdBQUcsQ0FBQyxVQUFVLENBQUMsV0FBVyxDQUFDLE9BQU8sSUFBSSxJQUFJLENBQWtCLENBQUM7WUFDMUUsSUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVLENBQUMsT0FBTyxFQUFFLE9BQU8sQ0FBQyxDQUFDO1lBQ2hGLElBQU0sUUFBUSxHQUFHLGFBQWEsQ0FBQywyQkFBMkIsSUFBSSxFQUFFLENBQUM7WUFDakUsT0FBTyxLQUFLLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQztpQkFDekIsTUFBTSxDQUFDLFVBQUEsVUFBVSxJQUFJLE9BQUEsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLFVBQUEsT0FBTyxJQUFJLE9BQUEsT0FBTyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsRUFBeEIsQ0FBd0IsQ0FBQyxFQUFuRCxDQUFtRCxDQUFDLENBQUM7UUFDakYsQ0FBQztRQUNILHlCQUFDO0lBQUQsQ0FBQyxBQXBKRCxJQW9KQztJQXBKWSxnREFBa0IiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtEZXBHcmFwaH0gZnJvbSAnZGVwZW5kZW5jeS1ncmFwaCc7XG5cbmltcG9ydCB7QWJzb2x1dGVGc1BhdGgsIEZpbGVTeXN0ZW0sIHJlc29sdmV9IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy9maWxlX3N5c3RlbSc7XG5pbXBvcnQge0xvZ2dlcn0gZnJvbSAnLi4vbG9nZ2luZy9sb2dnZXInO1xuaW1wb3J0IHtOZ2NjQ29uZmlndXJhdGlvbn0gZnJvbSAnLi4vcGFja2FnZXMvY29uZmlndXJhdGlvbic7XG5pbXBvcnQge0VudHJ5UG9pbnQsIEVudHJ5UG9pbnRGb3JtYXQsIGdldEVudHJ5UG9pbnRGb3JtYXQsIFNVUFBPUlRFRF9GT1JNQVRfUFJPUEVSVElFU30gZnJvbSAnLi4vcGFja2FnZXMvZW50cnlfcG9pbnQnO1xuaW1wb3J0IHtQYXJ0aWFsbHlPcmRlcmVkTGlzdH0gZnJvbSAnLi4vdXRpbHMnO1xuXG5pbXBvcnQge2NyZWF0ZURlcGVuZGVuY3lJbmZvLCBEZXBlbmRlbmN5SG9zdCwgRW50cnlQb2ludFdpdGhEZXBlbmRlbmNpZXN9IGZyb20gJy4vZGVwZW5kZW5jeV9ob3N0JztcblxuY29uc3QgYnVpbHRpbk5vZGVKc01vZHVsZXMgPSBuZXcgU2V0PHN0cmluZz4ocmVxdWlyZSgnbW9kdWxlJykuYnVpbHRpbk1vZHVsZXMpO1xuXG4vKipcbiAqIEhvbGRzIGluZm9ybWF0aW9uIGFib3V0IGVudHJ5IHBvaW50cyB0aGF0IGFyZSByZW1vdmVkIGJlY2F1c2VcbiAqIHRoZXkgaGF2ZSBkZXBlbmRlbmNpZXMgdGhhdCBhcmUgbWlzc2luZyAoZGlyZWN0bHkgb3IgdHJhbnNpdGl2ZWx5KS5cbiAqXG4gKiBUaGlzIG1pZ2h0IG5vdCBiZSBhbiBlcnJvciwgYmVjYXVzZSBzdWNoIGFuIGVudHJ5IHBvaW50IG1pZ2h0IG5vdCBhY3R1YWxseSBiZSB1c2VkXG4gKiBpbiB0aGUgYXBwbGljYXRpb24uIElmIGl0IGlzIHVzZWQgdGhlbiB0aGUgYG5nY2AgYXBwbGljYXRpb24gY29tcGlsYXRpb24gd291bGRcbiAqIGZhaWwgYWxzbywgc28gd2UgZG9uJ3QgbmVlZCBuZ2NjIHRvIGNhdGNoIHRoaXMuXG4gKlxuICogRm9yIGV4YW1wbGUsIGNvbnNpZGVyIGFuIGFwcGxpY2F0aW9uIHRoYXQgdXNlcyB0aGUgYEBhbmd1bGFyL3JvdXRlcmAgcGFja2FnZS5cbiAqIFRoaXMgcGFja2FnZSBpbmNsdWRlcyBhbiBlbnRyeS1wb2ludCBjYWxsZWQgYEBhbmd1bGFyL3JvdXRlci91cGdyYWRlYCwgd2hpY2ggaGFzIGEgZGVwZW5kZW5jeVxuICogb24gdGhlIGBAYW5ndWxhci91cGdyYWRlYCBwYWNrYWdlLlxuICogSWYgdGhlIGFwcGxpY2F0aW9uIG5ldmVyIHVzZXMgY29kZSBmcm9tIGBAYW5ndWxhci9yb3V0ZXIvdXBncmFkZWAgdGhlbiB0aGVyZSBpcyBubyBuZWVkIGZvclxuICogYEBhbmd1bGFyL3VwZ3JhZGVgIHRvIGJlIGluc3RhbGxlZC5cbiAqIEluIHRoaXMgY2FzZSB0aGUgbmdjYyB0b29sIHNob3VsZCBqdXN0IGlnbm9yZSB0aGUgYEBhbmd1bGFyL3JvdXRlci91cGdyYWRlYCBlbmQtcG9pbnQuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgSW52YWxpZEVudHJ5UG9pbnQge1xuICBlbnRyeVBvaW50OiBFbnRyeVBvaW50O1xuICBtaXNzaW5nRGVwZW5kZW5jaWVzOiBzdHJpbmdbXTtcbn1cblxuLyoqXG4gKiBIb2xkcyBpbmZvcm1hdGlvbiBhYm91dCBkZXBlbmRlbmNpZXMgb2YgYW4gZW50cnktcG9pbnQgdGhhdCBkbyBub3QgbmVlZCB0byBiZSBwcm9jZXNzZWRcbiAqIGJ5IHRoZSBuZ2NjIHRvb2wuXG4gKlxuICogRm9yIGV4YW1wbGUsIHRoZSBgcnhqc2AgcGFja2FnZSBkb2VzIG5vdCBjb250YWluIGFueSBBbmd1bGFyIGRlY29yYXRvcnMgdGhhdCBuZWVkIHRvIGJlXG4gKiBjb21waWxlZCBhbmQgc28gdGhpcyBjYW4gYmUgc2FmZWx5IGlnbm9yZWQgYnkgbmdjYy5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBJZ25vcmVkRGVwZW5kZW5jeSB7XG4gIGVudHJ5UG9pbnQ6IEVudHJ5UG9pbnQ7XG4gIGRlcGVuZGVuY3lQYXRoOiBzdHJpbmc7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgRGVwZW5kZW5jeURpYWdub3N0aWNzIHtcbiAgaW52YWxpZEVudHJ5UG9pbnRzOiBJbnZhbGlkRW50cnlQb2ludFtdO1xuICBpZ25vcmVkRGVwZW5kZW5jaWVzOiBJZ25vcmVkRGVwZW5kZW5jeVtdO1xufVxuXG4vKipcbiAqIFJlcHJlc2VudHMgYSBwYXJ0aWFsbHkgb3JkZXJlZCBsaXN0IG9mIGVudHJ5LXBvaW50cy5cbiAqXG4gKiBUaGUgZW50cnktcG9pbnRzJyBvcmRlci9wcmVjZWRlbmNlIGlzIHN1Y2ggdGhhdCBkZXBlbmRlbnQgZW50cnktcG9pbnRzIGFsd2F5cyBjb21lIGxhdGVyIHRoYW5cbiAqIHRoZWlyIGRlcGVuZGVuY2llcyBpbiB0aGUgbGlzdC5cbiAqXG4gKiBTZWUgYERlcGVuZGVuY3lSZXNvbHZlciNzb3J0RW50cnlQb2ludHNCeURlcGVuZGVuY3koKWAuXG4gKi9cbmV4cG9ydCB0eXBlIFBhcnRpYWxseU9yZGVyZWRFbnRyeVBvaW50cyA9IFBhcnRpYWxseU9yZGVyZWRMaXN0PEVudHJ5UG9pbnQ+O1xuXG4vKipcbiAqIEEgbGlzdCBvZiBlbnRyeS1wb2ludHMsIHNvcnRlZCBieSB0aGVpciBkZXBlbmRlbmNpZXMsIGFuZCB0aGUgZGVwZW5kZW5jeSBncmFwaC5cbiAqXG4gKiBUaGUgYGVudHJ5UG9pbnRzYCBhcnJheSB3aWxsIGJlIG9yZGVyZWQgc28gdGhhdCBubyBlbnRyeSBwb2ludCBkZXBlbmRzIHVwb24gYW4gZW50cnkgcG9pbnQgdGhhdFxuICogYXBwZWFycyBsYXRlciBpbiB0aGUgYXJyYXkuXG4gKlxuICogU29tZSBlbnRyeSBwb2ludHMgb3IgdGhlaXIgZGVwZW5kZW5jaWVzIG1heSBoYXZlIGJlZW4gaWdub3JlZC4gVGhlc2UgYXJlIGNhcHR1cmVkIGZvclxuICogZGlhZ25vc3RpYyBwdXJwb3NlcyBpbiBgaW52YWxpZEVudHJ5UG9pbnRzYCBhbmQgYGlnbm9yZWREZXBlbmRlbmNpZXNgIHJlc3BlY3RpdmVseS5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBTb3J0ZWRFbnRyeVBvaW50c0luZm8gZXh0ZW5kcyBEZXBlbmRlbmN5RGlhZ25vc3RpY3Mge1xuICBlbnRyeVBvaW50czogUGFydGlhbGx5T3JkZXJlZEVudHJ5UG9pbnRzO1xuICBncmFwaDogRGVwR3JhcGg8RW50cnlQb2ludD47XG59XG5cbi8qKlxuICogQSBjbGFzcyB0aGF0IHJlc29sdmVzIGRlcGVuZGVuY2llcyBiZXR3ZWVuIGVudHJ5LXBvaW50cy5cbiAqL1xuZXhwb3J0IGNsYXNzIERlcGVuZGVuY3lSZXNvbHZlciB7XG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSBmczogRmlsZVN5c3RlbSwgcHJpdmF0ZSBsb2dnZXI6IExvZ2dlciwgcHJpdmF0ZSBjb25maWc6IE5nY2NDb25maWd1cmF0aW9uLFxuICAgICAgcHJpdmF0ZSBob3N0czogUGFydGlhbDxSZWNvcmQ8RW50cnlQb2ludEZvcm1hdCwgRGVwZW5kZW5jeUhvc3Q+PixcbiAgICAgIHByaXZhdGUgdHlwaW5nc0hvc3Q6IERlcGVuZGVuY3lIb3N0KSB7fVxuICAvKipcbiAgICogU29ydCB0aGUgYXJyYXkgb2YgZW50cnkgcG9pbnRzIHNvIHRoYXQgdGhlIGRlcGVuZGFudCBlbnRyeSBwb2ludHMgYWx3YXlzIGNvbWUgbGF0ZXIgdGhhblxuICAgKiB0aGVpciBkZXBlbmRlbmNpZXMgaW4gdGhlIGFycmF5LlxuICAgKiBAcGFyYW0gZW50cnlQb2ludHMgQW4gYXJyYXkgZW50cnkgcG9pbnRzIHRvIHNvcnQuXG4gICAqIEBwYXJhbSB0YXJnZXQgSWYgcHJvdmlkZWQsIG9ubHkgcmV0dXJuIGVudHJ5LXBvaW50cyBkZXBlbmRlZCBvbiBieSB0aGlzIGVudHJ5LXBvaW50LlxuICAgKiBAcmV0dXJucyB0aGUgcmVzdWx0IG9mIHNvcnRpbmcgdGhlIGVudHJ5IHBvaW50cyBieSBkZXBlbmRlbmN5LlxuICAgKi9cbiAgc29ydEVudHJ5UG9pbnRzQnlEZXBlbmRlbmN5KGVudHJ5UG9pbnRzOiBFbnRyeVBvaW50V2l0aERlcGVuZGVuY2llc1tdLCB0YXJnZXQ/OiBFbnRyeVBvaW50KTpcbiAgICAgIFNvcnRlZEVudHJ5UG9pbnRzSW5mbyB7XG4gICAgY29uc3Qge2ludmFsaWRFbnRyeVBvaW50cywgaWdub3JlZERlcGVuZGVuY2llcywgZ3JhcGh9ID1cbiAgICAgICAgdGhpcy5jb21wdXRlRGVwZW5kZW5jeUdyYXBoKGVudHJ5UG9pbnRzKTtcblxuICAgIGxldCBzb3J0ZWRFbnRyeVBvaW50Tm9kZXM6IHN0cmluZ1tdO1xuICAgIGlmICh0YXJnZXQpIHtcbiAgICAgIGlmICh0YXJnZXQuY29tcGlsZWRCeUFuZ3VsYXIgJiYgZ3JhcGguaGFzTm9kZSh0YXJnZXQucGF0aCkpIHtcbiAgICAgICAgc29ydGVkRW50cnlQb2ludE5vZGVzID0gZ3JhcGguZGVwZW5kZW5jaWVzT2YodGFyZ2V0LnBhdGgpO1xuICAgICAgICBzb3J0ZWRFbnRyeVBvaW50Tm9kZXMucHVzaCh0YXJnZXQucGF0aCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzb3J0ZWRFbnRyeVBvaW50Tm9kZXMgPSBbXTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgc29ydGVkRW50cnlQb2ludE5vZGVzID0gZ3JhcGgub3ZlcmFsbE9yZGVyKCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIGVudHJ5UG9pbnRzOiAoc29ydGVkRW50cnlQb2ludE5vZGVzIGFzIFBhcnRpYWxseU9yZGVyZWRMaXN0PHN0cmluZz4pXG4gICAgICAgICAgICAgICAgICAgICAgIC5tYXAocGF0aCA9PiBncmFwaC5nZXROb2RlRGF0YShwYXRoKSksXG4gICAgICBncmFwaCxcbiAgICAgIGludmFsaWRFbnRyeVBvaW50cyxcbiAgICAgIGlnbm9yZWREZXBlbmRlbmNpZXMsXG4gICAgfTtcbiAgfVxuXG4gIGdldEVudHJ5UG9pbnRXaXRoRGVwZW5kZW5jaWVzKGVudHJ5UG9pbnQ6IEVudHJ5UG9pbnQpOiBFbnRyeVBvaW50V2l0aERlcGVuZGVuY2llcyB7XG4gICAgY29uc3QgZGVwZW5kZW5jaWVzID0gY3JlYXRlRGVwZW5kZW5jeUluZm8oKTtcbiAgICBpZiAoZW50cnlQb2ludC5jb21waWxlZEJ5QW5ndWxhcikge1xuICAgICAgLy8gT25seSBib3RoZXIgdG8gY29tcHV0ZSBkZXBlbmRlbmNpZXMgb2YgZW50cnktcG9pbnRzIHRoYXQgaGF2ZSBiZWVuIGNvbXBpbGVkIGJ5IEFuZ3VsYXJcbiAgICAgIGNvbnN0IGZvcm1hdEluZm8gPSB0aGlzLmdldEVudHJ5UG9pbnRGb3JtYXRJbmZvKGVudHJ5UG9pbnQpO1xuICAgICAgY29uc3QgaG9zdCA9IHRoaXMuaG9zdHNbZm9ybWF0SW5mby5mb3JtYXRdO1xuICAgICAgaWYgKCFob3N0KSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICAgIGBDb3VsZCBub3QgZmluZCBhIHN1aXRhYmxlIGZvcm1hdCBmb3IgY29tcHV0aW5nIGRlcGVuZGVuY2llcyBvZiBlbnRyeS1wb2ludDogJyR7XG4gICAgICAgICAgICAgICAgZW50cnlQb2ludC5wYXRofScuYCk7XG4gICAgICB9XG4gICAgICBob3N0LmNvbGxlY3REZXBlbmRlbmNpZXMoZm9ybWF0SW5mby5wYXRoLCBkZXBlbmRlbmNpZXMpO1xuICAgICAgdGhpcy50eXBpbmdzSG9zdC5jb2xsZWN0RGVwZW5kZW5jaWVzKGVudHJ5UG9pbnQudHlwaW5ncywgZGVwZW5kZW5jaWVzKTtcbiAgICB9XG4gICAgcmV0dXJuIHtlbnRyeVBvaW50LCBkZXBJbmZvOiBkZXBlbmRlbmNpZXN9O1xuICB9XG5cbiAgLyoqXG4gICAqIENvbXB1dGVzIGEgZGVwZW5kZW5jeSBncmFwaCBvZiB0aGUgZ2l2ZW4gZW50cnktcG9pbnRzLlxuICAgKlxuICAgKiBUaGUgZ3JhcGggb25seSBob2xkcyBlbnRyeS1wb2ludHMgdGhhdCBuZ2NjIGNhcmVzIGFib3V0IGFuZCB3aG9zZSBkZXBlbmRlbmNpZXNcbiAgICogKGRpcmVjdCBhbmQgdHJhbnNpdGl2ZSkgYWxsIGV4aXN0LlxuICAgKi9cbiAgcHJpdmF0ZSBjb21wdXRlRGVwZW5kZW5jeUdyYXBoKGVudHJ5UG9pbnRzOiBFbnRyeVBvaW50V2l0aERlcGVuZGVuY2llc1tdKTogRGVwZW5kZW5jeUdyYXBoIHtcbiAgICBjb25zdCBpbnZhbGlkRW50cnlQb2ludHM6IEludmFsaWRFbnRyeVBvaW50W10gPSBbXTtcbiAgICBjb25zdCBpZ25vcmVkRGVwZW5kZW5jaWVzOiBJZ25vcmVkRGVwZW5kZW5jeVtdID0gW107XG4gICAgY29uc3QgZ3JhcGggPSBuZXcgRGVwR3JhcGg8RW50cnlQb2ludD4oKTtcblxuICAgIGNvbnN0IGFuZ3VsYXJFbnRyeVBvaW50cyA9IGVudHJ5UG9pbnRzLmZpbHRlcihlID0+IGUuZW50cnlQb2ludC5jb21waWxlZEJ5QW5ndWxhcik7XG5cbiAgICAvLyBBZGQgdGhlIEFuZ3VsYXIgY29tcGlsZWQgZW50cnkgcG9pbnRzIHRvIHRoZSBncmFwaCBhcyBub2Rlc1xuICAgIGFuZ3VsYXJFbnRyeVBvaW50cy5mb3JFYWNoKGUgPT4gZ3JhcGguYWRkTm9kZShlLmVudHJ5UG9pbnQucGF0aCwgZS5lbnRyeVBvaW50KSk7XG5cbiAgICAvLyBOb3cgYWRkIHRoZSBkZXBlbmRlbmNpZXMgYmV0d2VlbiB0aGVtXG4gICAgYW5ndWxhckVudHJ5UG9pbnRzLmZvckVhY2goKHtlbnRyeVBvaW50LCBkZXBJbmZvOiB7ZGVwZW5kZW5jaWVzLCBtaXNzaW5nLCBkZWVwSW1wb3J0c319KSA9PiB7XG4gICAgICBjb25zdCBtaXNzaW5nRGVwZW5kZW5jaWVzID0gQXJyYXkuZnJvbShtaXNzaW5nKS5maWx0ZXIoZGVwID0+ICFidWlsdGluTm9kZUpzTW9kdWxlcy5oYXMoZGVwKSk7XG5cbiAgICAgIGlmIChtaXNzaW5nRGVwZW5kZW5jaWVzLmxlbmd0aCA+IDAgJiYgIWVudHJ5UG9pbnQuaWdub3JlTWlzc2luZ0RlcGVuZGVuY2llcykge1xuICAgICAgICAvLyBUaGlzIGVudHJ5IHBvaW50IGhhcyBkZXBlbmRlbmNpZXMgdGhhdCBhcmUgbWlzc2luZ1xuICAgICAgICAvLyBzbyByZW1vdmUgaXQgZnJvbSB0aGUgZ3JhcGguXG4gICAgICAgIHJlbW92ZU5vZGVzKGVudHJ5UG9pbnQsIG1pc3NpbmdEZXBlbmRlbmNpZXMpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZGVwZW5kZW5jaWVzLmZvckVhY2goZGVwZW5kZW5jeVBhdGggPT4ge1xuICAgICAgICAgIGlmICghZ3JhcGguaGFzTm9kZShlbnRyeVBvaW50LnBhdGgpKSB7XG4gICAgICAgICAgICAvLyBUaGUgZW50cnktcG9pbnQgaGFzIGFscmVhZHkgYmVlbiBpZGVudGlmaWVkIGFzIGludmFsaWQgc28gd2UgZG9uJ3QgbmVlZFxuICAgICAgICAgICAgLy8gdG8gZG8gYW55IGZ1cnRoZXIgd29yayBvbiBpdC5cbiAgICAgICAgICB9IGVsc2UgaWYgKGdyYXBoLmhhc05vZGUoZGVwZW5kZW5jeVBhdGgpKSB7XG4gICAgICAgICAgICAvLyBUaGUgZW50cnktcG9pbnQgaXMgc3RpbGwgdmFsaWQgKGkuZS4gaGFzIG5vIG1pc3NpbmcgZGVwZW5kZW5jaWVzKSBhbmRcbiAgICAgICAgICAgIC8vIHRoZSBkZXBlbmRlbmN5IG1hcHMgdG8gYW4gZW50cnkgcG9pbnQgdGhhdCBleGlzdHMgaW4gdGhlIGdyYXBoIHNvIGFkZCBpdFxuICAgICAgICAgICAgZ3JhcGguYWRkRGVwZW5kZW5jeShlbnRyeVBvaW50LnBhdGgsIGRlcGVuZGVuY3lQYXRoKTtcbiAgICAgICAgICB9IGVsc2UgaWYgKGludmFsaWRFbnRyeVBvaW50cy5zb21lKGkgPT4gaS5lbnRyeVBvaW50LnBhdGggPT09IGRlcGVuZGVuY3lQYXRoKSkge1xuICAgICAgICAgICAgLy8gVGhlIGRlcGVuZGVuY3kgcGF0aCBtYXBzIHRvIGFuIGVudHJ5LXBvaW50IHRoYXQgd2FzIHByZXZpb3VzbHkgcmVtb3ZlZFxuICAgICAgICAgICAgLy8gZnJvbSB0aGUgZ3JhcGgsIHNvIHJlbW92ZSB0aGlzIGVudHJ5LXBvaW50IGFzIHdlbGwuXG4gICAgICAgICAgICByZW1vdmVOb2RlcyhlbnRyeVBvaW50LCBbZGVwZW5kZW5jeVBhdGhdKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gVGhlIGRlcGVuZGVuY3kgcGF0aCBwb2ludHMgdG8gYSBwYWNrYWdlIHRoYXQgbmdjYyBkb2VzIG5vdCBjYXJlIGFib3V0LlxuICAgICAgICAgICAgaWdub3JlZERlcGVuZGVuY2llcy5wdXNoKHtlbnRyeVBvaW50LCBkZXBlbmRlbmN5UGF0aH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIGlmIChkZWVwSW1wb3J0cy5zaXplID4gMCkge1xuICAgICAgICBjb25zdCBub3RhYmxlRGVlcEltcG9ydHMgPSB0aGlzLmZpbHRlcklnbm9yYWJsZURlZXBJbXBvcnRzKGVudHJ5UG9pbnQsIGRlZXBJbXBvcnRzKTtcbiAgICAgICAgaWYgKG5vdGFibGVEZWVwSW1wb3J0cy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgY29uc3QgaW1wb3J0cyA9IG5vdGFibGVEZWVwSW1wb3J0cy5tYXAoaSA9PiBgJyR7aX0nYCkuam9pbignLCAnKTtcbiAgICAgICAgICB0aGlzLmxvZ2dlci53YXJuKFxuICAgICAgICAgICAgICBgRW50cnkgcG9pbnQgJyR7ZW50cnlQb2ludC5uYW1lfScgY29udGFpbnMgZGVlcCBpbXBvcnRzIGludG8gJHtpbXBvcnRzfS4gYCArXG4gICAgICAgICAgICAgIGBUaGlzIGlzIHByb2JhYmx5IG5vdCBhIHByb2JsZW0sIGJ1dCBtYXkgY2F1c2UgdGhlIGNvbXBpbGF0aW9uIG9mIGVudHJ5IHBvaW50cyB0byBiZSBvdXQgb2Ygb3JkZXIuYCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcblxuICAgIHJldHVybiB7aW52YWxpZEVudHJ5UG9pbnRzLCBpZ25vcmVkRGVwZW5kZW5jaWVzLCBncmFwaH07XG5cbiAgICBmdW5jdGlvbiByZW1vdmVOb2RlcyhlbnRyeVBvaW50OiBFbnRyeVBvaW50LCBtaXNzaW5nRGVwZW5kZW5jaWVzOiBzdHJpbmdbXSkge1xuICAgICAgY29uc3Qgbm9kZXNUb1JlbW92ZSA9IFtlbnRyeVBvaW50LnBhdGgsIC4uLmdyYXBoLmRlcGVuZGFudHNPZihlbnRyeVBvaW50LnBhdGgpXTtcbiAgICAgIG5vZGVzVG9SZW1vdmUuZm9yRWFjaChub2RlID0+IHtcbiAgICAgICAgaW52YWxpZEVudHJ5UG9pbnRzLnB1c2goe2VudHJ5UG9pbnQ6IGdyYXBoLmdldE5vZGVEYXRhKG5vZGUpLCBtaXNzaW5nRGVwZW5kZW5jaWVzfSk7XG4gICAgICAgIGdyYXBoLnJlbW92ZU5vZGUobm9kZSk7XG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGdldEVudHJ5UG9pbnRGb3JtYXRJbmZvKGVudHJ5UG9pbnQ6IEVudHJ5UG9pbnQpOlxuICAgICAge2Zvcm1hdDogRW50cnlQb2ludEZvcm1hdCwgcGF0aDogQWJzb2x1dGVGc1BhdGh9IHtcbiAgICBmb3IgKGNvbnN0IHByb3BlcnR5IG9mIFNVUFBPUlRFRF9GT1JNQVRfUFJPUEVSVElFUykge1xuICAgICAgY29uc3QgZm9ybWF0UGF0aCA9IGVudHJ5UG9pbnQucGFja2FnZUpzb25bcHJvcGVydHldO1xuICAgICAgaWYgKGZvcm1hdFBhdGggPT09IHVuZGVmaW5lZCkgY29udGludWU7XG5cbiAgICAgIGNvbnN0IGZvcm1hdCA9IGdldEVudHJ5UG9pbnRGb3JtYXQodGhpcy5mcywgZW50cnlQb2ludCwgcHJvcGVydHkpO1xuICAgICAgaWYgKGZvcm1hdCA9PT0gdW5kZWZpbmVkKSBjb250aW51ZTtcblxuICAgICAgcmV0dXJuIHtmb3JtYXQsIHBhdGg6IHJlc29sdmUoZW50cnlQb2ludC5wYXRoLCBmb3JtYXRQYXRoKX07XG4gICAgfVxuXG4gICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICBgVGhlcmUgaXMgbm8gYXBwcm9wcmlhdGUgc291cmNlIGNvZGUgZm9ybWF0IGluICcke2VudHJ5UG9pbnQucGF0aH0nIGVudHJ5LXBvaW50LmApO1xuICB9XG5cbiAgLyoqXG4gICAqIEZpbHRlciBvdXQgdGhlIGRlZXBJbXBvcnRzIHRoYXQgY2FuIGJlIGlnbm9yZWQsIGFjY29yZGluZyB0byB0aGlzIGVudHJ5UG9pbnQncyBjb25maWcuXG4gICAqL1xuICBwcml2YXRlIGZpbHRlcklnbm9yYWJsZURlZXBJbXBvcnRzKGVudHJ5UG9pbnQ6IEVudHJ5UG9pbnQsIGRlZXBJbXBvcnRzOiBTZXQ8QWJzb2x1dGVGc1BhdGg+KTpcbiAgICAgIEFic29sdXRlRnNQYXRoW10ge1xuICAgIGNvbnN0IHZlcnNpb24gPSAoZW50cnlQb2ludC5wYWNrYWdlSnNvbi52ZXJzaW9uIHx8IG51bGwpIGFzIHN0cmluZyB8IG51bGw7XG4gICAgY29uc3QgcGFja2FnZUNvbmZpZyA9IHRoaXMuY29uZmlnLmdldFBhY2thZ2VDb25maWcoZW50cnlQb2ludC5wYWNrYWdlLCB2ZXJzaW9uKTtcbiAgICBjb25zdCBtYXRjaGVycyA9IHBhY2thZ2VDb25maWcuaWdub3JhYmxlRGVlcEltcG9ydE1hdGNoZXJzIHx8IFtdO1xuICAgIHJldHVybiBBcnJheS5mcm9tKGRlZXBJbXBvcnRzKVxuICAgICAgICAuZmlsdGVyKGRlZXBJbXBvcnQgPT4gIW1hdGNoZXJzLnNvbWUobWF0Y2hlciA9PiBtYXRjaGVyLnRlc3QoZGVlcEltcG9ydCkpKTtcbiAgfVxufVxuXG5pbnRlcmZhY2UgRGVwZW5kZW5jeUdyYXBoIGV4dGVuZHMgRGVwZW5kZW5jeURpYWdub3N0aWNzIHtcbiAgZ3JhcGg6IERlcEdyYXBoPEVudHJ5UG9pbnQ+O1xufVxuIl19