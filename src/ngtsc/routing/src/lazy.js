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
        define("@angular/compiler-cli/src/ngtsc/routing/src/lazy", ["require", "exports", "tslib", "typescript", "@angular/compiler-cli/src/ngtsc/imports"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var ts = require("typescript");
    var imports_1 = require("@angular/compiler-cli/src/ngtsc/imports");
    var ROUTES_MARKER = '__ngRoutesMarker__';
    function scanForRouteEntryPoints(ngModule, moduleName, data, entryPointManager, evaluator) {
        var e_1, _a;
        var loadChildrenIdentifiers = [];
        var from = entryPointManager.fromNgModule(ngModule, moduleName);
        if (data.providers !== null) {
            loadChildrenIdentifiers.push.apply(loadChildrenIdentifiers, tslib_1.__spread(scanForProviders(data.providers, evaluator)));
        }
        if (data.imports !== null) {
            loadChildrenIdentifiers.push.apply(loadChildrenIdentifiers, tslib_1.__spread(scanForRouterModuleUsage(data.imports, evaluator)));
        }
        if (data.exports !== null) {
            loadChildrenIdentifiers.push.apply(loadChildrenIdentifiers, tslib_1.__spread(scanForRouterModuleUsage(data.exports, evaluator)));
        }
        var routes = [];
        try {
            for (var loadChildrenIdentifiers_1 = tslib_1.__values(loadChildrenIdentifiers), loadChildrenIdentifiers_1_1 = loadChildrenIdentifiers_1.next(); !loadChildrenIdentifiers_1_1.done; loadChildrenIdentifiers_1_1 = loadChildrenIdentifiers_1.next()) {
                var loadChildren = loadChildrenIdentifiers_1_1.value;
                var resolvedTo = entryPointManager.resolveLoadChildrenIdentifier(loadChildren, ngModule);
                if (resolvedTo !== null) {
                    routes.push({
                        loadChildren: loadChildren, from: from, resolvedTo: resolvedTo,
                    });
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (loadChildrenIdentifiers_1_1 && !loadChildrenIdentifiers_1_1.done && (_a = loadChildrenIdentifiers_1.return)) _a.call(loadChildrenIdentifiers_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
        return routes;
    }
    exports.scanForRouteEntryPoints = scanForRouteEntryPoints;
    function scanForProviders(expr, evaluator) {
        var loadChildrenIdentifiers = [];
        var providers = evaluator.evaluate(expr);
        function recursivelyAddProviders(provider) {
            var e_2, _a;
            if (Array.isArray(provider)) {
                try {
                    for (var provider_1 = tslib_1.__values(provider), provider_1_1 = provider_1.next(); !provider_1_1.done; provider_1_1 = provider_1.next()) {
                        var entry = provider_1_1.value;
                        recursivelyAddProviders(entry);
                    }
                }
                catch (e_2_1) { e_2 = { error: e_2_1 }; }
                finally {
                    try {
                        if (provider_1_1 && !provider_1_1.done && (_a = provider_1.return)) _a.call(provider_1);
                    }
                    finally { if (e_2) throw e_2.error; }
                }
            }
            else if (provider instanceof Map) {
                if (provider.has('provide') && provider.has('useValue')) {
                    var provide = provider.get('provide');
                    var useValue = provider.get('useValue');
                    if (isRouteToken(provide) && Array.isArray(useValue)) {
                        loadChildrenIdentifiers.push.apply(loadChildrenIdentifiers, tslib_1.__spread(scanForLazyRoutes(useValue)));
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
            var e_3, _a;
            if (Array.isArray(imp)) {
                try {
                    for (var imp_1 = tslib_1.__values(imp), imp_1_1 = imp_1.next(); !imp_1_1.done; imp_1_1 = imp_1.next()) {
                        var entry = imp_1_1.value;
                        recursivelyAddRoutes(entry);
                    }
                }
                catch (e_3_1) { e_3 = { error: e_3_1 }; }
                finally {
                    try {
                        if (imp_1_1 && !imp_1_1.done && (_a = imp_1.return)) _a.call(imp_1);
                    }
                    finally { if (e_3) throw e_3.error; }
                }
            }
            else if (imp instanceof Map) {
                if (imp.has(ROUTES_MARKER) && imp.has('routes')) {
                    var routes = imp.get('routes');
                    if (Array.isArray(routes)) {
                        loadChildrenIdentifiers.push.apply(loadChildrenIdentifiers, tslib_1.__spread(scanForLazyRoutes(routes)));
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
            var e_4, _a;
            try {
                for (var routes_1 = tslib_1.__values(routes), routes_1_1 = routes_1.next(); !routes_1_1.done; routes_1_1 = routes_1.next()) {
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
                            recursivelyScanRoutes(routes);
                        }
                    }
                }
            }
            catch (e_4_1) { e_4 = { error: e_4_1 }; }
            finally {
                try {
                    if (routes_1_1 && !routes_1_1.done && (_a = routes_1.return)) _a.call(routes_1);
                }
                finally { if (e_4) throw e_4.error; }
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
        else if (ref.moduleName !== '@angular/router') {
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
    function isMethodNodeReference(ref) {
        return ref instanceof imports_1.NodeReference && ts.isMethodDeclaration(ref.node);
    }
    function isRouteToken(ref) {
        return ref instanceof imports_1.AbsoluteReference && ref.moduleName === '@angular/router' &&
            ref.symbolName === 'ROUTES';
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGF6eS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2Mvcm91dGluZy9zcmMvbGF6eS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFFSCwrQkFBaUM7SUFFakMsbUVBQTBFO0lBTTFFLElBQU0sYUFBYSxHQUFHLG9CQUFvQixDQUFDO0lBUTNDLFNBQWdCLHVCQUF1QixDQUNuQyxRQUF1QixFQUFFLFVBQWtCLEVBQUUsSUFBMEIsRUFDdkUsaUJBQTBDLEVBQUUsU0FBMkI7O1FBQ3pFLElBQU0sdUJBQXVCLEdBQWEsRUFBRSxDQUFDO1FBQzdDLElBQU0sSUFBSSxHQUFHLGlCQUFpQixDQUFDLFlBQVksQ0FBQyxRQUFRLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFDbEUsSUFBSSxJQUFJLENBQUMsU0FBUyxLQUFLLElBQUksRUFBRTtZQUMzQix1QkFBdUIsQ0FBQyxJQUFJLE9BQTVCLHVCQUF1QixtQkFBUyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLFNBQVMsQ0FBQyxHQUFFO1NBQzlFO1FBQ0QsSUFBSSxJQUFJLENBQUMsT0FBTyxLQUFLLElBQUksRUFBRTtZQUN6Qix1QkFBdUIsQ0FBQyxJQUFJLE9BQTVCLHVCQUF1QixtQkFBUyx3QkFBd0IsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLFNBQVMsQ0FBQyxHQUFFO1NBQ3BGO1FBQ0QsSUFBSSxJQUFJLENBQUMsT0FBTyxLQUFLLElBQUksRUFBRTtZQUN6Qix1QkFBdUIsQ0FBQyxJQUFJLE9BQTVCLHVCQUF1QixtQkFBUyx3QkFBd0IsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLFNBQVMsQ0FBQyxHQUFFO1NBQ3BGO1FBQ0QsSUFBTSxNQUFNLEdBQXFCLEVBQUUsQ0FBQzs7WUFDcEMsS0FBMkIsSUFBQSw0QkFBQSxpQkFBQSx1QkFBdUIs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UUFBUSxDQUFDO0lBQ2xDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge0Fic29sdXRlUmVmZXJlbmNlLCBOb2RlUmVmZXJlbmNlLCBSZWZlcmVuY2V9IGZyb20gJy4uLy4uL2ltcG9ydHMnO1xuaW1wb3J0IHtGb3JlaWduRnVuY3Rpb25SZXNvbHZlciwgUGFydGlhbEV2YWx1YXRvciwgUmVzb2x2ZWRWYWx1ZX0gZnJvbSAnLi4vLi4vcGFydGlhbF9ldmFsdWF0b3InO1xuXG5pbXBvcnQge05nTW9kdWxlUmF3Um91dGVEYXRhfSBmcm9tICcuL2FuYWx5emVyJztcbmltcG9ydCB7Um91dGVyRW50cnlQb2ludCwgUm91dGVyRW50cnlQb2ludE1hbmFnZXJ9IGZyb20gJy4vcm91dGUnO1xuXG5jb25zdCBST1VURVNfTUFSS0VSID0gJ19fbmdSb3V0ZXNNYXJrZXJfXyc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgTGF6eVJvdXRlRW50cnkge1xuICBsb2FkQ2hpbGRyZW46IHN0cmluZztcbiAgZnJvbTogUm91dGVyRW50cnlQb2ludDtcbiAgcmVzb2x2ZWRUbzogUm91dGVyRW50cnlQb2ludDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNjYW5Gb3JSb3V0ZUVudHJ5UG9pbnRzKFxuICAgIG5nTW9kdWxlOiB0cy5Tb3VyY2VGaWxlLCBtb2R1bGVOYW1lOiBzdHJpbmcsIGRhdGE6IE5nTW9kdWxlUmF3Um91dGVEYXRhLFxuICAgIGVudHJ5UG9pbnRNYW5hZ2VyOiBSb3V0ZXJFbnRyeVBvaW50TWFuYWdlciwgZXZhbHVhdG9yOiBQYXJ0aWFsRXZhbHVhdG9yKTogTGF6eVJvdXRlRW50cnlbXSB7XG4gIGNvbnN0IGxvYWRDaGlsZHJlbklkZW50aWZpZXJzOiBzdHJpbmdbXSA9IFtdO1xuICBjb25zdCBmcm9tID0gZW50cnlQb2ludE1hbmFnZXIuZnJvbU5nTW9kdWxlKG5nTW9kdWxlLCBtb2R1bGVOYW1lKTtcbiAgaWYgKGRhdGEucHJvdmlkZXJzICE9PSBudWxsKSB7XG4gICAgbG9hZENoaWxkcmVuSWRlbnRpZmllcnMucHVzaCguLi5zY2FuRm9yUHJvdmlkZXJzKGRhdGEucHJvdmlkZXJzLCBldmFsdWF0b3IpKTtcbiAgfVxuICBpZiAoZGF0YS5pbXBvcnRzICE9PSBudWxsKSB7XG4gICAgbG9hZENoaWxkcmVuSWRlbnRpZmllcnMucHVzaCguLi5zY2FuRm9yUm91dGVyTW9kdWxlVXNhZ2UoZGF0YS5pbXBvcnRzLCBldmFsdWF0b3IpKTtcbiAgfVxuICBpZiAoZGF0YS5leHBvcnRzICE9PSBudWxsKSB7XG4gICAgbG9hZENoaWxkcmVuSWRlbnRpZmllcnMucHVzaCguLi5zY2FuRm9yUm91dGVyTW9kdWxlVXNhZ2UoZGF0YS5leHBvcnRzLCBldmFsdWF0b3IpKTtcbiAgfVxuICBjb25zdCByb3V0ZXM6IExhenlSb3V0ZUVudHJ5W10gPSBbXTtcbiAgZm9yIChjb25zdCBsb2FkQ2hpbGRyZW4gb2YgbG9hZENoaWxkcmVuSWRlbnRpZmllcnMpIHtcbiAgICBjb25zdCByZXNvbHZlZFRvID0gZW50cnlQb2ludE1hbmFnZXIucmVzb2x2ZUxvYWRDaGlsZHJlbklkZW50aWZpZXIobG9hZENoaWxkcmVuLCBuZ01vZHVsZSk7XG4gICAgaWYgKHJlc29sdmVkVG8gIT09IG51bGwpIHtcbiAgICAgIHJvdXRlcy5wdXNoKHtcbiAgICAgICAgICBsb2FkQ2hpbGRyZW4sIGZyb20sIHJlc29sdmVkVG8sXG4gICAgICB9KTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHJvdXRlcztcbn1cblxuZnVuY3Rpb24gc2NhbkZvclByb3ZpZGVycyhleHByOiB0cy5FeHByZXNzaW9uLCBldmFsdWF0b3I6IFBhcnRpYWxFdmFsdWF0b3IpOiBzdHJpbmdbXSB7XG4gIGNvbnN0IGxvYWRDaGlsZHJlbklkZW50aWZpZXJzOiBzdHJpbmdbXSA9IFtdO1xuICBjb25zdCBwcm92aWRlcnMgPSBldmFsdWF0b3IuZXZhbHVhdGUoZXhwcik7XG5cbiAgZnVuY3Rpb24gcmVjdXJzaXZlbHlBZGRQcm92aWRlcnMocHJvdmlkZXI6IFJlc29sdmVkVmFsdWUpOiB2b2lkIHtcbiAgICBpZiAoQXJyYXkuaXNBcnJheShwcm92aWRlcikpIHtcbiAgICAgIGZvciAoY29uc3QgZW50cnkgb2YgcHJvdmlkZXIpIHtcbiAgICAgICAgcmVjdXJzaXZlbHlBZGRQcm92aWRlcnMoZW50cnkpO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAocHJvdmlkZXIgaW5zdGFuY2VvZiBNYXApIHtcbiAgICAgIGlmIChwcm92aWRlci5oYXMoJ3Byb3ZpZGUnKSAmJiBwcm92aWRlci5oYXMoJ3VzZVZhbHVlJykpIHtcbiAgICAgICAgY29uc3QgcHJvdmlkZSA9IHByb3ZpZGVyLmdldCgncHJvdmlkZScpO1xuICAgICAgICBjb25zdCB1c2VWYWx1ZSA9IHByb3ZpZGVyLmdldCgndXNlVmFsdWUnKTtcbiAgICAgICAgaWYgKGlzUm91dGVUb2tlbihwcm92aWRlKSAmJiBBcnJheS5pc0FycmF5KHVzZVZhbHVlKSkge1xuICAgICAgICAgIGxvYWRDaGlsZHJlbklkZW50aWZpZXJzLnB1c2goLi4uc2NhbkZvckxhenlSb3V0ZXModXNlVmFsdWUpKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJlY3Vyc2l2ZWx5QWRkUHJvdmlkZXJzKHByb3ZpZGVycyk7XG4gIHJldHVybiBsb2FkQ2hpbGRyZW5JZGVudGlmaWVycztcbn1cblxuZnVuY3Rpb24gc2NhbkZvclJvdXRlck1vZHVsZVVzYWdlKGV4cHI6IHRzLkV4cHJlc3Npb24sIGV2YWx1YXRvcjogUGFydGlhbEV2YWx1YXRvcik6IHN0cmluZ1tdIHtcbiAgY29uc3QgbG9hZENoaWxkcmVuSWRlbnRpZmllcnM6IHN0cmluZ1tdID0gW107XG4gIGNvbnN0IGltcG9ydHMgPSBldmFsdWF0b3IuZXZhbHVhdGUoZXhwciwgcm91dGVyTW9kdWxlRkZSKTtcblxuICBmdW5jdGlvbiByZWN1cnNpdmVseUFkZFJvdXRlcyhpbXA6IFJlc29sdmVkVmFsdWUpIHtcbiAgICBpZiAoQXJyYXkuaXNBcnJheShpbXApKSB7XG4gICAgICBmb3IgKGNvbnN0IGVudHJ5IG9mIGltcCkge1xuICAgICAgICByZWN1cnNpdmVseUFkZFJvdXRlcyhlbnRyeSk7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChpbXAgaW5zdGFuY2VvZiBNYXApIHtcbiAgICAgIGlmIChpbXAuaGFzKFJPVVRFU19NQVJLRVIpICYmIGltcC5oYXMoJ3JvdXRlcycpKSB7XG4gICAgICAgIGNvbnN0IHJvdXRlcyA9IGltcC5nZXQoJ3JvdXRlcycpO1xuICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShyb3V0ZXMpKSB7XG4gICAgICAgICAgbG9hZENoaWxkcmVuSWRlbnRpZmllcnMucHVzaCguLi5zY2FuRm9yTGF6eVJvdXRlcyhyb3V0ZXMpKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJlY3Vyc2l2ZWx5QWRkUm91dGVzKGltcG9ydHMpO1xuICByZXR1cm4gbG9hZENoaWxkcmVuSWRlbnRpZmllcnM7XG59XG5cbmZ1bmN0aW9uIHNjYW5Gb3JMYXp5Um91dGVzKHJvdXRlczogUmVzb2x2ZWRWYWx1ZVtdKTogc3RyaW5nW10ge1xuICBjb25zdCBsb2FkQ2hpbGRyZW5JZGVudGlmaWVyczogc3RyaW5nW10gPSBbXTtcblxuICBmdW5jdGlvbiByZWN1cnNpdmVseVNjYW5Sb3V0ZXMocm91dGVzOiBSZXNvbHZlZFZhbHVlW10pOiB2b2lkIHtcbiAgICBmb3IgKGxldCByb3V0ZSBvZiByb3V0ZXMpIHtcbiAgICAgIGlmICghKHJvdXRlIGluc3RhbmNlb2YgTWFwKSkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGlmIChyb3V0ZS5oYXMoJ2xvYWRDaGlsZHJlbicpKSB7XG4gICAgICAgIGNvbnN0IGxvYWRDaGlsZHJlbiA9IHJvdXRlLmdldCgnbG9hZENoaWxkcmVuJyk7XG4gICAgICAgIGlmICh0eXBlb2YgbG9hZENoaWxkcmVuID09PSAnc3RyaW5nJykge1xuICAgICAgICAgIGxvYWRDaGlsZHJlbklkZW50aWZpZXJzLnB1c2gobG9hZENoaWxkcmVuKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmIChyb3V0ZS5oYXMoJ2NoaWxkcmVuJykpIHtcbiAgICAgICAgY29uc3QgY2hpbGRyZW4gPSByb3V0ZS5nZXQoJ2NoaWxkcmVuJyk7XG4gICAgICAgIGlmIChBcnJheS5pc0FycmF5KGNoaWxkcmVuKSkge1xuICAgICAgICAgIHJlY3Vyc2l2ZWx5U2NhblJvdXRlcyhyb3V0ZXMpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmVjdXJzaXZlbHlTY2FuUm91dGVzKHJvdXRlcyk7XG4gIHJldHVybiBsb2FkQ2hpbGRyZW5JZGVudGlmaWVycztcbn1cblxuLyoqXG4gKiBBIGZvcmVpZ24gZnVuY3Rpb24gcmVzb2x2ZXIgdGhhdCBjb252ZXJ0cyBgUm91dGVyTW9kdWxlLmZvclJvb3QvZm9yQ2hpbGQoWClgIHRvIGEgc3BlY2lhbCBvYmplY3RcbiAqIG9mIHRoZSBmb3JtIGB7X19uZ1JvdXRlc01hcmtlcl9fOiB0cnVlLCByb3V0ZXM6IFh9YC5cbiAqXG4gKiBUaGVzZSBvYmplY3RzIGFyZSB0aGVuIHJlY29nbml6YWJsZSBpbnNpZGUgdGhlIGxhcmdlciBzZXQgb2YgaW1wb3J0cy9leHBvcnRzLlxuICovXG5jb25zdCByb3V0ZXJNb2R1bGVGRlI6IEZvcmVpZ25GdW5jdGlvblJlc29sdmVyID1cbiAgICBmdW5jdGlvbiByb3V0ZXJNb2R1bGVGRlIoXG4gICAgICAgIHJlZjogUmVmZXJlbmNlPHRzLkZ1bmN0aW9uRGVjbGFyYXRpb258dHMuTWV0aG9kRGVjbGFyYXRpb258dHMuRnVuY3Rpb25FeHByZXNzaW9uPixcbiAgICAgICAgYXJnczogUmVhZG9ubHlBcnJheTx0cy5FeHByZXNzaW9uPik6IHRzLkV4cHJlc3Npb24gfFxuICAgIG51bGwge1xuICAgICAgaWYgKCFpc01ldGhvZE5vZGVSZWZlcmVuY2UocmVmKSB8fCAhdHMuaXNDbGFzc0RlY2xhcmF0aW9uKHJlZi5ub2RlLnBhcmVudCkpIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9IGVsc2UgaWYgKHJlZi5tb2R1bGVOYW1lICE9PSAnQGFuZ3VsYXIvcm91dGVyJykge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH0gZWxzZSBpZiAoXG4gICAgICAgICAgcmVmLm5vZGUucGFyZW50Lm5hbWUgPT09IHVuZGVmaW5lZCB8fCByZWYubm9kZS5wYXJlbnQubmFtZS50ZXh0ICE9PSAnUm91dGVyTW9kdWxlJykge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH0gZWxzZSBpZiAoXG4gICAgICAgICAgIXRzLmlzSWRlbnRpZmllcihyZWYubm9kZS5uYW1lKSB8fFxuICAgICAgICAgIChyZWYubm9kZS5uYW1lLnRleHQgIT09ICdmb3JSb290JyAmJiByZWYubm9kZS5uYW1lLnRleHQgIT09ICdmb3JDaGlsZCcpKSB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfVxuXG4gICAgICBjb25zdCByb3V0ZXMgPSBhcmdzWzBdO1xuICAgICAgcmV0dXJuIHRzLmNyZWF0ZU9iamVjdExpdGVyYWwoW1xuICAgICAgICB0cy5jcmVhdGVQcm9wZXJ0eUFzc2lnbm1lbnQoUk9VVEVTX01BUktFUiwgdHMuY3JlYXRlVHJ1ZSgpKSxcbiAgICAgICAgdHMuY3JlYXRlUHJvcGVydHlBc3NpZ25tZW50KCdyb3V0ZXMnLCByb3V0ZXMpLFxuICAgICAgXSk7XG4gICAgfTtcblxuZnVuY3Rpb24gaXNNZXRob2ROb2RlUmVmZXJlbmNlKFxuICAgIHJlZjogUmVmZXJlbmNlPHRzLkZ1bmN0aW9uRGVjbGFyYXRpb258dHMuTWV0aG9kRGVjbGFyYXRpb258dHMuRnVuY3Rpb25FeHByZXNzaW9uPik6XG4gICAgcmVmIGlzIE5vZGVSZWZlcmVuY2U8dHMuTWV0aG9kRGVjbGFyYXRpb24+IHtcbiAgcmV0dXJuIHJlZiBpbnN0YW5jZW9mIE5vZGVSZWZlcmVuY2UgJiYgdHMuaXNNZXRob2REZWNsYXJhdGlvbihyZWYubm9kZSk7XG59XG5cbmZ1bmN0aW9uIGlzUm91dGVUb2tlbihyZWY6IFJlc29sdmVkVmFsdWUpOiBib29sZWFuIHtcbiAgcmV0dXJuIHJlZiBpbnN0YW5jZW9mIEFic29sdXRlUmVmZXJlbmNlICYmIHJlZi5tb2R1bGVOYW1lID09PSAnQGFuZ3VsYXIvcm91dGVyJyAmJlxuICAgICAgcmVmLnN5bWJvbE5hbWUgPT09ICdST1VURVMnO1xufVxuIl19