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
        define("@angular/compiler-cli/src/ngtsc/routing/src/lazy", ["require", "exports", "tslib", "typescript", "@angular/compiler-cli/src/ngtsc/imports", "@angular/compiler-cli/src/ngtsc/routing/src/route"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.scanForRouteEntryPoints = exports.scanForCandidateTransitiveModules = void 0;
    var tslib_1 = require("tslib");
    var ts = require("typescript");
    var imports_1 = require("@angular/compiler-cli/src/ngtsc/imports");
    var route_1 = require("@angular/compiler-cli/src/ngtsc/routing/src/route");
    var ROUTES_MARKER = '__ngRoutesMarker__';
    function scanForCandidateTransitiveModules(expr, evaluator) {
        if (expr === null) {
            return [];
        }
        var candidateModuleKeys = [];
        var entries = evaluator.evaluate(expr);
        function recursivelyAddModules(entry) {
            var e_1, _a;
            if (Array.isArray(entry)) {
                try {
                    for (var entry_1 = (0, tslib_1.__values)(entry), entry_1_1 = entry_1.next(); !entry_1_1.done; entry_1_1 = entry_1.next()) {
                        var e = entry_1_1.value;
                        recursivelyAddModules(e);
                    }
                }
                catch (e_1_1) { e_1 = { error: e_1_1 }; }
                finally {
                    try {
                        if (entry_1_1 && !entry_1_1.done && (_a = entry_1.return)) _a.call(entry_1);
                    }
                    finally { if (e_1) throw e_1.error; }
                }
            }
            else if (entry instanceof Map) {
                if (entry.has('ngModule')) {
                    recursivelyAddModules(entry.get('ngModule'));
                }
            }
            else if ((entry instanceof imports_1.Reference) && hasIdentifier(entry.node)) {
                var filePath = entry.node.getSourceFile().fileName;
                var moduleName = entry.node.name.text;
                candidateModuleKeys.push((0, route_1.entryPointKeyFor)(filePath, moduleName));
            }
        }
        recursivelyAddModules(entries);
        return candidateModuleKeys;
    }
    exports.scanForCandidateTransitiveModules = scanForCandidateTransitiveModules;
    function scanForRouteEntryPoints(ngModule, moduleName, data, entryPointManager, evaluator) {
        var e_2, _a;
        var loadChildrenIdentifiers = [];
        var from = entryPointManager.fromNgModule(ngModule, moduleName);
        if (data.providers !== null) {
            loadChildrenIdentifiers.push.apply(loadChildrenIdentifiers, (0, tslib_1.__spreadArray)([], (0, tslib_1.__read)(scanForProviders(data.providers, evaluator)), false));
        }
        if (data.imports !== null) {
            loadChildrenIdentifiers.push.apply(loadChildrenIdentifiers, (0, tslib_1.__spreadArray)([], (0, tslib_1.__read)(scanForRouterModuleUsage(data.imports, evaluator)), false));
        }
        if (data.exports !== null) {
            loadChildrenIdentifiers.push.apply(loadChildrenIdentifiers, (0, tslib_1.__spreadArray)([], (0, tslib_1.__read)(scanForRouterModuleUsage(data.exports, evaluator)), false));
        }
        var routes = [];
        try {
            for (var loadChildrenIdentifiers_1 = (0, tslib_1.__values)(loadChildrenIdentifiers), loadChildrenIdentifiers_1_1 = loadChildrenIdentifiers_1.next(); !loadChildrenIdentifiers_1_1.done; loadChildrenIdentifiers_1_1 = loadChildrenIdentifiers_1.next()) {
                var loadChildren = loadChildrenIdentifiers_1_1.value;
                var resolvedTo = entryPointManager.resolveLoadChildrenIdentifier(loadChildren, ngModule);
                if (resolvedTo !== null) {
                    routes.push({
                        loadChildren: loadChildren,
                        from: from,
                        resolvedTo: resolvedTo,
                    });
                }
            }
        }
        catch (e_2_1) { e_2 = { error: e_2_1 }; }
        finally {
            try {
                if (loadChildrenIdentifiers_1_1 && !loadChildrenIdentifiers_1_1.done && (_a = loadChildrenIdentifiers_1.return)) _a.call(loadChildrenIdentifiers_1);
            }
            finally { if (e_2) throw e_2.error; }
        }
        return routes;
    }
    exports.scanForRouteEntryPoints = scanForRouteEntryPoints;
    function scanForProviders(expr, evaluator) {
        var loadChildrenIdentifiers = [];
        var providers = evaluator.evaluate(expr);
        function recursivelyAddProviders(provider) {
            var e_3, _a;
            if (Array.isArray(provider)) {
                try {
                    for (var provider_1 = (0, tslib_1.__values)(provider), provider_1_1 = provider_1.next(); !provider_1_1.done; provider_1_1 = provider_1.next()) {
                        var entry = provider_1_1.value;
                        recursivelyAddProviders(entry);
                    }
                }
                catch (e_3_1) { e_3 = { error: e_3_1 }; }
                finally {
                    try {
                        if (provider_1_1 && !provider_1_1.done && (_a = provider_1.return)) _a.call(provider_1);
                    }
                    finally { if (e_3) throw e_3.error; }
                }
            }
            else if (provider instanceof Map) {
                if (provider.has('provide') && provider.has('useValue')) {
                    var provide = provider.get('provide');
                    var useValue = provider.get('useValue');
                    if (isRouteToken(provide) && Array.isArray(useValue)) {
                        loadChildrenIdentifiers.push.apply(loadChildrenIdentifiers, (0, tslib_1.__spreadArray)([], (0, tslib_1.__read)(scanForLazyRoutes(useValue)), false));
                    }
                }
            }
        }
        recursivelyAddProviders(providers);
        return loadChildrenIdentifiers;
    }
    function scanForRouterModuleUsage(expr, evaluator) {
        var loadChildrenIdentifiers = [];
        var imports = evaluator.evaluate(expr, routerModuleFFR);
        function recursivelyAddRoutes(imp) {
            var e_4, _a;
            if (Array.isArray(imp)) {
                try {
                    for (var imp_1 = (0, tslib_1.__values)(imp), imp_1_1 = imp_1.next(); !imp_1_1.done; imp_1_1 = imp_1.next()) {
                        var entry = imp_1_1.value;
                        recursivelyAddRoutes(entry);
                    }
                }
                catch (e_4_1) { e_4 = { error: e_4_1 }; }
                finally {
                    try {
                        if (imp_1_1 && !imp_1_1.done && (_a = imp_1.return)) _a.call(imp_1);
                    }
                    finally { if (e_4) throw e_4.error; }
                }
            }
            else if (imp instanceof Map) {
                if (imp.has(ROUTES_MARKER) && imp.has('routes')) {
                    var routes = imp.get('routes');
                    if (Array.isArray(routes)) {
                        loadChildrenIdentifiers.push.apply(loadChildrenIdentifiers, (0, tslib_1.__spreadArray)([], (0, tslib_1.__read)(scanForLazyRoutes(routes)), false));
                    }
                }
            }
        }
        recursivelyAddRoutes(imports);
        return loadChildrenIdentifiers;
    }
    function scanForLazyRoutes(routes) {
        var loadChildrenIdentifiers = [];
        function recursivelyScanRoutes(routes) {
            var e_5, _a;
            try {
                for (var routes_1 = (0, tslib_1.__values)(routes), routes_1_1 = routes_1.next(); !routes_1_1.done; routes_1_1 = routes_1.next()) {
                    var route = routes_1_1.value;
                    if (!(route instanceof Map)) {
                        continue;
                    }
                    if (route.has('loadChildren')) {
                        var loadChildren = route.get('loadChildren');
                        if (typeof loadChildren === 'string') {
                            loadChildrenIdentifiers.push(loadChildren);
                        }
                    }
                    else if (route.has('children')) {
                        var children = route.get('children');
                        if (Array.isArray(children)) {
                            recursivelyScanRoutes(children);
                        }
                    }
                }
            }
            catch (e_5_1) { e_5 = { error: e_5_1 }; }
            finally {
                try {
                    if (routes_1_1 && !routes_1_1.done && (_a = routes_1.return)) _a.call(routes_1);
                }
                finally { if (e_5) throw e_5.error; }
            }
        }
        recursivelyScanRoutes(routes);
        return loadChildrenIdentifiers;
    }
    /**
     * A foreign function resolver that converts `RouterModule.forRoot/forChild(X)` to a special object
     * of the form `{__ngRoutesMarker__: true, routes: X}`.
     *
     * These objects are then recognizable inside the larger set of imports/exports.
     */
    var routerModuleFFR = function routerModuleFFR(ref, args) {
        if (!isMethodNodeReference(ref) || !ts.isClassDeclaration(ref.node.parent)) {
            return null;
        }
        else if (ref.bestGuessOwningModule === null ||
            ref.bestGuessOwningModule.specifier !== '@angular/router') {
            return null;
        }
        else if (ref.node.parent.name === undefined || ref.node.parent.name.text !== 'RouterModule') {
            return null;
        }
        else if (!ts.isIdentifier(ref.node.name) ||
            (ref.node.name.text !== 'forRoot' && ref.node.name.text !== 'forChild')) {
            return null;
        }
        var routes = args[0];
        return ts.createObjectLiteral([
            ts.createPropertyAssignment(ROUTES_MARKER, ts.createTrue()),
            ts.createPropertyAssignment('routes', routes),
        ]);
    };
    function hasIdentifier(node) {
        var node_ = node;
        return (node_.name !== undefined) && ts.isIdentifier(node_.name);
    }
    function isMethodNodeReference(ref) {
        return ts.isMethodDeclaration(ref.node);
    }
    function isRouteToken(ref) {
        return ref instanceof imports_1.Reference && ref.bestGuessOwningModule !== null &&
            ref.bestGuessOwningModule.specifier === '@angular/router' && ref.debugName === 'ROUTES';
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGF6eS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2Mvcm91dGluZy9zcmMvbGF6eS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7O0lBRUgsK0JBQWlDO0lBRWpDLG1FQUF3QztJQUl4QywyRUFBb0Y7SUFFcEYsSUFBTSxhQUFhLEdBQUcsb0JBQW9CLENBQUM7SUFRM0MsU0FBZ0IsaUNBQWlDLENBQzdDLElBQXdCLEVBQUUsU0FBMkI7UUFDdkQsSUFBSSxJQUFJLEtBQUssSUFBSSxFQUFFO1lBQ2pCLE9BQU8sRUFBRSxDQUFDO1NBQ1g7UUFFRCxJQUFNLG1CQUFtQixHQUFhLEVBQUUsQ0FBQztRQUN6QyxJQUFNLE9BQU8sR0FBRyxTQUFTLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBRXpDLFNBQVMscUJBQXFCLENBQUMsS0FBb0I7O1lBQ2pELElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsRUFBRTs7b0JBQ3hCLEtBQWdCLElBQUEsVUFBQSxzQkFBQSxLQUFLLENBQUEsNEJBQUEsK0NBQUU7d0JBQWxCLElBQU0sQ0FBQyxrQkFBQTt3QkFDVixxQkFBcUIsQ0FBQyxDQUFDLENBQUMsQ0FBQztxQkFDMUI7Ozs7Ozs7OzthQUNGO2lCQUFNLElBQUksS0FBSyxZQUFZLEdBQUcsRUFBRTtnQkFDL0IsSUFBSSxLQUFLLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxFQUFFO29CQUN6QixxQkFBcUIsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBRSxDQUFDLENBQUM7aUJBQy9DO2FBQ0Y7aUJBQU0sSUFBSSxDQUFDLEtBQUssWUFBWSxtQkFBUyxDQUFDLElBQUksYUFBYSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsRUFBRTtnQkFDcEUsSUFBTSxRQUFRLEdBQUcs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Q25FLENBQUM7SUFFRCxTQUFTLHFCQUFxQixDQUMxQixHQUFpRjtRQUVuRixPQUFPLEVBQUUsQ0FBQyxtQkFBbUIsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDMUMsQ0FBQztJQUVELFNBQVMsWUFBWSxDQUFDLEdBQWtCO1FBQ3RDLE9BQU8sR0FBRyxZQUFZLG1CQUFTLElBQUksR0FBRyxDQUFDLHFCQUFxQixLQUFLLElBQUk7WUFDakUsR0FBRyxDQUFDLHFCQUFxQixDQUFDLFNBQVMsS0FBSyxpQkFBaUIsSUFBSSxHQUFHLENBQUMsU0FBUyxLQUFLLFFBQVEsQ0FBQztJQUM5RixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge1JlZmVyZW5jZX0gZnJvbSAnLi4vLi4vaW1wb3J0cyc7XG5pbXBvcnQge0ZvcmVpZ25GdW5jdGlvblJlc29sdmVyLCBQYXJ0aWFsRXZhbHVhdG9yLCBSZXNvbHZlZFZhbHVlfSBmcm9tICcuLi8uLi9wYXJ0aWFsX2V2YWx1YXRvcic7XG5cbmltcG9ydCB7TmdNb2R1bGVSYXdSb3V0ZURhdGF9IGZyb20gJy4vYW5hbHl6ZXInO1xuaW1wb3J0IHtlbnRyeVBvaW50S2V5Rm9yLCBSb3V0ZXJFbnRyeVBvaW50LCBSb3V0ZXJFbnRyeVBvaW50TWFuYWdlcn0gZnJvbSAnLi9yb3V0ZSc7XG5cbmNvbnN0IFJPVVRFU19NQVJLRVIgPSAnX19uZ1JvdXRlc01hcmtlcl9fJztcblxuZXhwb3J0IGludGVyZmFjZSBMYXp5Um91dGVFbnRyeSB7XG4gIGxvYWRDaGlsZHJlbjogc3RyaW5nO1xuICBmcm9tOiBSb3V0ZXJFbnRyeVBvaW50O1xuICByZXNvbHZlZFRvOiBSb3V0ZXJFbnRyeVBvaW50O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc2NhbkZvckNhbmRpZGF0ZVRyYW5zaXRpdmVNb2R1bGVzKFxuICAgIGV4cHI6IHRzLkV4cHJlc3Npb258bnVsbCwgZXZhbHVhdG9yOiBQYXJ0aWFsRXZhbHVhdG9yKTogc3RyaW5nW10ge1xuICBpZiAoZXhwciA9PT0gbnVsbCkge1xuICAgIHJldHVybiBbXTtcbiAgfVxuXG4gIGNvbnN0IGNhbmRpZGF0ZU1vZHVsZUtleXM6IHN0cmluZ1tdID0gW107XG4gIGNvbnN0IGVudHJpZXMgPSBldmFsdWF0b3IuZXZhbHVhdGUoZXhwcik7XG5cbiAgZnVuY3Rpb24gcmVjdXJzaXZlbHlBZGRNb2R1bGVzKGVudHJ5OiBSZXNvbHZlZFZhbHVlKSB7XG4gICAgaWYgKEFycmF5LmlzQXJyYXkoZW50cnkpKSB7XG4gICAgICBmb3IgKGNvbnN0IGUgb2YgZW50cnkpIHtcbiAgICAgICAgcmVjdXJzaXZlbHlBZGRNb2R1bGVzKGUpO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAoZW50cnkgaW5zdGFuY2VvZiBNYXApIHtcbiAgICAgIGlmIChlbnRyeS5oYXMoJ25nTW9kdWxlJykpIHtcbiAgICAgICAgcmVjdXJzaXZlbHlBZGRNb2R1bGVzKGVudHJ5LmdldCgnbmdNb2R1bGUnKSEpO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAoKGVudHJ5IGluc3RhbmNlb2YgUmVmZXJlbmNlKSAmJiBoYXNJZGVudGlmaWVyKGVudHJ5Lm5vZGUpKSB7XG4gICAgICBjb25zdCBmaWxlUGF0aCA9IGVudHJ5Lm5vZGUuZ2V0U291cmNlRmlsZSgpLmZpbGVOYW1lO1xuICAgICAgY29uc3QgbW9kdWxlTmFtZSA9IGVudHJ5Lm5vZGUubmFtZS50ZXh0O1xuICAgICAgY2FuZGlkYXRlTW9kdWxlS2V5cy5wdXNoKGVudHJ5UG9pbnRLZXlGb3IoZmlsZVBhdGgsIG1vZHVsZU5hbWUpKTtcbiAgICB9XG4gIH1cblxuICByZWN1cnNpdmVseUFkZE1vZHVsZXMoZW50cmllcyk7XG4gIHJldHVybiBjYW5kaWRhdGVNb2R1bGVLZXlzO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc2NhbkZvclJvdXRlRW50cnlQb2ludHMoXG4gICAgbmdNb2R1bGU6IHRzLlNvdXJjZUZpbGUsIG1vZHVsZU5hbWU6IHN0cmluZywgZGF0YTogTmdNb2R1bGVSYXdSb3V0ZURhdGEsXG4gICAgZW50cnlQb2ludE1hbmFnZXI6IFJvdXRlckVudHJ5UG9pbnRNYW5hZ2VyLCBldmFsdWF0b3I6IFBhcnRpYWxFdmFsdWF0b3IpOiBMYXp5Um91dGVFbnRyeVtdIHtcbiAgY29uc3QgbG9hZENoaWxkcmVuSWRlbnRpZmllcnM6IHN0cmluZ1tdID0gW107XG4gIGNvbnN0IGZyb20gPSBlbnRyeVBvaW50TWFuYWdlci5mcm9tTmdNb2R1bGUobmdNb2R1bGUsIG1vZHVsZU5hbWUpO1xuICBpZiAoZGF0YS5wcm92aWRlcnMgIT09IG51bGwpIHtcbiAgICBsb2FkQ2hpbGRyZW5JZGVudGlmaWVycy5wdXNoKC4uLnNjYW5Gb3JQcm92aWRlcnMoZGF0YS5wcm92aWRlcnMsIGV2YWx1YXRvcikpO1xuICB9XG4gIGlmIChkYXRhLmltcG9ydHMgIT09IG51bGwpIHtcbiAgICBsb2FkQ2hpbGRyZW5JZGVudGlmaWVycy5wdXNoKC4uLnNjYW5Gb3JSb3V0ZXJNb2R1bGVVc2FnZShkYXRhLmltcG9ydHMsIGV2YWx1YXRvcikpO1xuICB9XG4gIGlmIChkYXRhLmV4cG9ydHMgIT09IG51bGwpIHtcbiAgICBsb2FkQ2hpbGRyZW5JZGVudGlmaWVycy5wdXNoKC4uLnNjYW5Gb3JSb3V0ZXJNb2R1bGVVc2FnZShkYXRhLmV4cG9ydHMsIGV2YWx1YXRvcikpO1xuICB9XG4gIGNvbnN0IHJvdXRlczogTGF6eVJvdXRlRW50cnlbXSA9IFtdO1xuICBmb3IgKGNvbnN0IGxvYWRDaGlsZHJlbiBvZiBsb2FkQ2hpbGRyZW5JZGVudGlmaWVycykge1xuICAgIGNvbnN0IHJlc29sdmVkVG8gPSBlbnRyeVBvaW50TWFuYWdlci5yZXNvbHZlTG9hZENoaWxkcmVuSWRlbnRpZmllcihsb2FkQ2hpbGRyZW4sIG5nTW9kdWxlKTtcbiAgICBpZiAocmVzb2x2ZWRUbyAhPT0gbnVsbCkge1xuICAgICAgcm91dGVzLnB1c2goe1xuICAgICAgICBsb2FkQ2hpbGRyZW4sXG4gICAgICAgIGZyb20sXG4gICAgICAgIHJlc29sdmVkVG8sXG4gICAgICB9KTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHJvdXRlcztcbn1cblxuZnVuY3Rpb24gc2NhbkZvclByb3ZpZGVycyhleHByOiB0cy5FeHByZXNzaW9uLCBldmFsdWF0b3I6IFBhcnRpYWxFdmFsdWF0b3IpOiBzdHJpbmdbXSB7XG4gIGNvbnN0IGxvYWRDaGlsZHJlbklkZW50aWZpZXJzOiBzdHJpbmdbXSA9IFtdO1xuICBjb25zdCBwcm92aWRlcnMgPSBldmFsdWF0b3IuZXZhbHVhdGUoZXhwcik7XG5cbiAgZnVuY3Rpb24gcmVjdXJzaXZlbHlBZGRQcm92aWRlcnMocHJvdmlkZXI6IFJlc29sdmVkVmFsdWUpOiB2b2lkIHtcbiAgICBpZiAoQXJyYXkuaXNBcnJheShwcm92aWRlcikpIHtcbiAgICAgIGZvciAoY29uc3QgZW50cnkgb2YgcHJvdmlkZXIpIHtcbiAgICAgICAgcmVjdXJzaXZlbHlBZGRQcm92aWRlcnMoZW50cnkpO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAocHJvdmlkZXIgaW5zdGFuY2VvZiBNYXApIHtcbiAgICAgIGlmIChwcm92aWRlci5oYXMoJ3Byb3ZpZGUnKSAmJiBwcm92aWRlci5oYXMoJ3VzZVZhbHVlJykpIHtcbiAgICAgICAgY29uc3QgcHJvdmlkZSA9IHByb3ZpZGVyLmdldCgncHJvdmlkZScpO1xuICAgICAgICBjb25zdCB1c2VWYWx1ZSA9IHByb3ZpZGVyLmdldCgndXNlVmFsdWUnKTtcbiAgICAgICAgaWYgKGlzUm91dGVUb2tlbihwcm92aWRlKSAmJiBBcnJheS5pc0FycmF5KHVzZVZhbHVlKSkge1xuICAgICAgICAgIGxvYWRDaGlsZHJlbklkZW50aWZpZXJzLnB1c2goLi4uc2NhbkZvckxhenlSb3V0ZXModXNlVmFsdWUpKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJlY3Vyc2l2ZWx5QWRkUHJvdmlkZXJzKHByb3ZpZGVycyk7XG4gIHJldHVybiBsb2FkQ2hpbGRyZW5JZGVudGlmaWVycztcbn1cblxuZnVuY3Rpb24gc2NhbkZvclJvdXRlck1vZHVsZVVzYWdlKGV4cHI6IHRzLkV4cHJlc3Npb24sIGV2YWx1YXRvcjogUGFydGlhbEV2YWx1YXRvcik6IHN0cmluZ1tdIHtcbiAgY29uc3QgbG9hZENoaWxkcmVuSWRlbnRpZmllcnM6IHN0cmluZ1tdID0gW107XG4gIGNvbnN0IGltcG9ydHMgPSBldmFsdWF0b3IuZXZhbHVhdGUoZXhwciwgcm91dGVyTW9kdWxlRkZSKTtcblxuICBmdW5jdGlvbiByZWN1cnNpdmVseUFkZFJvdXRlcyhpbXA6IFJlc29sdmVkVmFsdWUpIHtcbiAgICBpZiAoQXJyYXkuaXNBcnJheShpbXApKSB7XG4gICAgICBmb3IgKGNvbnN0IGVudHJ5IG9mIGltcCkge1xuICAgICAgICByZWN1cnNpdmVseUFkZFJvdXRlcyhlbnRyeSk7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChpbXAgaW5zdGFuY2VvZiBNYXApIHtcbiAgICAgIGlmIChpbXAuaGFzKFJPVVRFU19NQVJLRVIpICYmIGltcC5oYXMoJ3JvdXRlcycpKSB7XG4gICAgICAgIGNvbnN0IHJvdXRlcyA9IGltcC5nZXQoJ3JvdXRlcycpO1xuICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShyb3V0ZXMpKSB7XG4gICAgICAgICAgbG9hZENoaWxkcmVuSWRlbnRpZmllcnMucHVzaCguLi5zY2FuRm9yTGF6eVJvdXRlcyhyb3V0ZXMpKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJlY3Vyc2l2ZWx5QWRkUm91dGVzKGltcG9ydHMpO1xuICByZXR1cm4gbG9hZENoaWxkcmVuSWRlbnRpZmllcnM7XG59XG5cbmZ1bmN0aW9uIHNjYW5Gb3JMYXp5Um91dGVzKHJvdXRlczogUmVzb2x2ZWRWYWx1ZVtdKTogc3RyaW5nW10ge1xuICBjb25zdCBsb2FkQ2hpbGRyZW5JZGVudGlmaWVyczogc3RyaW5nW10gPSBbXTtcblxuICBmdW5jdGlvbiByZWN1cnNpdmVseVNjYW5Sb3V0ZXMocm91dGVzOiBSZXNvbHZlZFZhbHVlW10pOiB2b2lkIHtcbiAgICBmb3IgKGxldCByb3V0ZSBvZiByb3V0ZXMpIHtcbiAgICAgIGlmICghKHJvdXRlIGluc3RhbmNlb2YgTWFwKSkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGlmIChyb3V0ZS5oYXMoJ2xvYWRDaGlsZHJlbicpKSB7XG4gICAgICAgIGNvbnN0IGxvYWRDaGlsZHJlbiA9IHJvdXRlLmdldCgnbG9hZENoaWxkcmVuJyk7XG4gICAgICAgIGlmICh0eXBlb2YgbG9hZENoaWxkcmVuID09PSAnc3RyaW5nJykge1xuICAgICAgICAgIGxvYWRDaGlsZHJlbklkZW50aWZpZXJzLnB1c2gobG9hZENoaWxkcmVuKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmIChyb3V0ZS5oYXMoJ2NoaWxkcmVuJykpIHtcbiAgICAgICAgY29uc3QgY2hpbGRyZW4gPSByb3V0ZS5nZXQoJ2NoaWxkcmVuJyk7XG4gICAgICAgIGlmIChBcnJheS5pc0FycmF5KGNoaWxkcmVuKSkge1xuICAgICAgICAgIHJlY3Vyc2l2ZWx5U2NhblJvdXRlcyhjaGlsZHJlbik7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZWN1cnNpdmVseVNjYW5Sb3V0ZXMocm91dGVzKTtcbiAgcmV0dXJuIGxvYWRDaGlsZHJlbklkZW50aWZpZXJzO1xufVxuXG4vKipcbiAqIEEgZm9yZWlnbiBmdW5jdGlvbiByZXNvbHZlciB0aGF0IGNvbnZlcnRzIGBSb3V0ZXJNb2R1bGUuZm9yUm9vdC9mb3JDaGlsZChYKWAgdG8gYSBzcGVjaWFsIG9iamVjdFxuICogb2YgdGhlIGZvcm0gYHtfX25nUm91dGVzTWFya2VyX186IHRydWUsIHJvdXRlczogWH1gLlxuICpcbiAqIFRoZXNlIG9iamVjdHMgYXJlIHRoZW4gcmVjb2duaXphYmxlIGluc2lkZSB0aGUgbGFyZ2VyIHNldCBvZiBpbXBvcnRzL2V4cG9ydHMuXG4gKi9cbmNvbnN0IHJvdXRlck1vZHVsZUZGUjogRm9yZWlnbkZ1bmN0aW9uUmVzb2x2ZXIgPVxuICAgIGZ1bmN0aW9uIHJvdXRlck1vZHVsZUZGUihcbiAgICAgICAgcmVmOiBSZWZlcmVuY2U8dHMuRnVuY3Rpb25EZWNsYXJhdGlvbnx0cy5NZXRob2REZWNsYXJhdGlvbnx0cy5GdW5jdGlvbkV4cHJlc3Npb24+LFxuICAgICAgICBhcmdzOiBSZWFkb25seUFycmF5PHRzLkV4cHJlc3Npb24+KTogdHMuRXhwcmVzc2lvbnxudWxsIHtcbiAgaWYgKCFpc01ldGhvZE5vZGVSZWZlcmVuY2UocmVmKSB8fCAhdHMuaXNDbGFzc0RlY2xhcmF0aW9uKHJlZi5ub2RlLnBhcmVudCkpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfSBlbHNlIGlmIChcbiAgICAgIHJlZi5iZXN0R3Vlc3NPd25pbmdNb2R1bGUgPT09IG51bGwgfHxcbiAgICAgIHJlZi5iZXN0R3Vlc3NPd25pbmdNb2R1bGUuc3BlY2lmaWVyICE9PSAnQGFuZ3VsYXIvcm91dGVyJykge1xuICAgIHJldHVybiBudWxsO1xuICB9IGVsc2UgaWYgKHJlZi5ub2RlLnBhcmVudC5uYW1lID09PSB1bmRlZmluZWQgfHwgcmVmLm5vZGUucGFyZW50Lm5hbWUudGV4dCAhPT0gJ1JvdXRlck1vZHVsZScpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfSBlbHNlIGlmIChcbiAgICAgICF0cy5pc0lkZW50aWZpZXIocmVmLm5vZGUubmFtZSkgfHxcbiAgICAgIChyZWYubm9kZS5uYW1lLnRleHQgIT09ICdmb3JSb290JyAmJiByZWYubm9kZS5uYW1lLnRleHQgIT09ICdmb3JDaGlsZCcpKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICBjb25zdCByb3V0ZXMgPSBhcmdzWzBdO1xuICByZXR1cm4gdHMuY3JlYXRlT2JqZWN0TGl0ZXJhbChbXG4gICAgdHMuY3JlYXRlUHJvcGVydHlBc3NpZ25tZW50KFJPVVRFU19NQVJLRVIsIHRzLmNyZWF0ZVRydWUoKSksXG4gICAgdHMuY3JlYXRlUHJvcGVydHlBc3NpZ25tZW50KCdyb3V0ZXMnLCByb3V0ZXMpLFxuICBdKTtcbn07XG5cbmZ1bmN0aW9uIGhhc0lkZW50aWZpZXIobm9kZTogdHMuTm9kZSk6IG5vZGUgaXMgdHMuTm9kZSZ7bmFtZTogdHMuSWRlbnRpZmllcn0ge1xuICBjb25zdCBub2RlXyA9IG5vZGUgYXMgdHMuTmFtZWREZWNsYXJhdGlvbjtcbiAgcmV0dXJuIChub2RlXy5uYW1lICE9PSB1bmRlZmluZWQpICYmIHRzLmlzSWRlbnRpZmllcihub2RlXy5uYW1lKTtcbn1cblxuZnVuY3Rpb24gaXNNZXRob2ROb2RlUmVmZXJlbmNlKFxuICAgIHJlZjogUmVmZXJlbmNlPHRzLkZ1bmN0aW9uRGVjbGFyYXRpb258dHMuTWV0aG9kRGVjbGFyYXRpb258dHMuRnVuY3Rpb25FeHByZXNzaW9uPik6XG4gICAgcmVmIGlzIFJlZmVyZW5jZTx0cy5NZXRob2REZWNsYXJhdGlvbj4ge1xuICByZXR1cm4gdHMuaXNNZXRob2REZWNsYXJhdGlvbihyZWYubm9kZSk7XG59XG5cbmZ1bmN0aW9uIGlzUm91dGVUb2tlbihyZWY6IFJlc29sdmVkVmFsdWUpOiBib29sZWFuIHtcbiAgcmV0dXJuIHJlZiBpbnN0YW5jZW9mIFJlZmVyZW5jZSAmJiByZWYuYmVzdEd1ZXNzT3duaW5nTW9kdWxlICE9PSBudWxsICYmXG4gICAgICByZWYuYmVzdEd1ZXNzT3duaW5nTW9kdWxlLnNwZWNpZmllciA9PT0gJ0Bhbmd1bGFyL3JvdXRlcicgJiYgcmVmLmRlYnVnTmFtZSA9PT0gJ1JPVVRFUyc7XG59XG4iXX0=