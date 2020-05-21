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
                    for (var entry_1 = tslib_1.__values(entry), entry_1_1 = entry_1.next(); !entry_1_1.done; entry_1_1 = entry_1.next()) {
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
                candidateModuleKeys.push(route_1.entryPointKeyFor(filePath, moduleName));
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
                    for (var provider_1 = tslib_1.__values(provider), provider_1_1 = provider_1.next(); !provider_1_1.done; provider_1_1 = provider_1.next()) {
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
            var e_4, _a;
            if (Array.isArray(imp)) {
                try {
                    for (var imp_1 = tslib_1.__values(imp), imp_1_1 = imp_1.next(); !imp_1_1.done; imp_1_1 = imp_1.next()) {
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
            var e_5, _a;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGF6eS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2Mvcm91dGluZy9zcmMvbGF6eS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7O0lBRUgsK0JBQWlDO0lBRWpDLG1FQUF3QztJQUl4QywyRUFBb0Y7SUFFcEYsSUFBTSxhQUFhLEdBQUcsb0JBQW9CLENBQUM7SUFRM0MsU0FBZ0IsaUNBQWlDLENBQzdDLElBQXdCLEVBQUUsU0FBMkI7UUFDdkQsSUFBSSxJQUFJLEtBQUssSUFBSSxFQUFFO1lBQ2pCLE9BQU8sRUFBRSxDQUFDO1NBQ1g7UUFFRCxJQUFNLG1CQUFtQixHQUFhLEVBQUUsQ0FBQztRQUN6QyxJQUFNLE9BQU8sR0FBRyxTQUFTLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBRXpDLFNBQVMscUJBQXFCLENBQUMsS0FBb0I7O1lBQ2pELElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsRUFBRTs7b0JBQ3hCLEtBQWdCLElBQUEsVUFBQSxpQkFBQSxLQUFLLENBQUEsNEJBQUEsK0NBQUU7d0JBQWxCLElBQU0sQ0FBQyxrQkFBQTt3QkFDVixxQkFBcUIsQ0FBQyxDQUFDLENBQUMsQ0FBQztxQkFDMUI7Ozs7Ozs7OzthQUNGO2lCQUFNLElBQUksS0FBSyxZQUFZLEdBQUcsRUFBRTtnQkFDL0IsSUFBSSxLQUFLLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxFQUFFO29CQUN6QixxQkFBcUIsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBRSxDQUFDLENBQUM7aUJBQy9DO2FBQ0Y7aUJBQU0sSUFBSSxDQUFDLEtBQUssWUFBWSxtQkFBUyxDQUFDLElBQUksYUFBYSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsRUFBRTtnQkFDcEUsSUFBTSxRQUFRLEdBQUcs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QUFDO0lBRUQsU0FBUyxxQkFBcUIsQ0FDMUIsR0FBaUY7UUFFbkYsT0FBTyxFQUFFLENBQUMsbUJBQW1CLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQzFDLENBQUM7SUFFRCxTQUFTLFlBQVksQ0FBQyxHQUFrQjtRQUN0QyxPQUFPLEdBQUcsWUFBWSxtQkFBUyxJQUFJLEdBQUcsQ0FBQyxxQkFBcUIsS0FBSyxJQUFJO1lBQ2pFLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBQyxTQUFTLEtBQUssaUJBQWlCLElBQUksR0FBRyxDQUFDLFNBQVMsS0FBSyxRQUFRLENBQUM7SUFDOUYsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7UmVmZXJlbmNlfSBmcm9tICcuLi8uLi9pbXBvcnRzJztcbmltcG9ydCB7Rm9yZWlnbkZ1bmN0aW9uUmVzb2x2ZXIsIFBhcnRpYWxFdmFsdWF0b3IsIFJlc29sdmVkVmFsdWV9IGZyb20gJy4uLy4uL3BhcnRpYWxfZXZhbHVhdG9yJztcblxuaW1wb3J0IHtOZ01vZHVsZVJhd1JvdXRlRGF0YX0gZnJvbSAnLi9hbmFseXplcic7XG5pbXBvcnQge2VudHJ5UG9pbnRLZXlGb3IsIFJvdXRlckVudHJ5UG9pbnQsIFJvdXRlckVudHJ5UG9pbnRNYW5hZ2VyfSBmcm9tICcuL3JvdXRlJztcblxuY29uc3QgUk9VVEVTX01BUktFUiA9ICdfX25nUm91dGVzTWFya2VyX18nO1xuXG5leHBvcnQgaW50ZXJmYWNlIExhenlSb3V0ZUVudHJ5IHtcbiAgbG9hZENoaWxkcmVuOiBzdHJpbmc7XG4gIGZyb206IFJvdXRlckVudHJ5UG9pbnQ7XG4gIHJlc29sdmVkVG86IFJvdXRlckVudHJ5UG9pbnQ7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzY2FuRm9yQ2FuZGlkYXRlVHJhbnNpdGl2ZU1vZHVsZXMoXG4gICAgZXhwcjogdHMuRXhwcmVzc2lvbnxudWxsLCBldmFsdWF0b3I6IFBhcnRpYWxFdmFsdWF0b3IpOiBzdHJpbmdbXSB7XG4gIGlmIChleHByID09PSBudWxsKSB7XG4gICAgcmV0dXJuIFtdO1xuICB9XG5cbiAgY29uc3QgY2FuZGlkYXRlTW9kdWxlS2V5czogc3RyaW5nW10gPSBbXTtcbiAgY29uc3QgZW50cmllcyA9IGV2YWx1YXRvci5ldmFsdWF0ZShleHByKTtcblxuICBmdW5jdGlvbiByZWN1cnNpdmVseUFkZE1vZHVsZXMoZW50cnk6IFJlc29sdmVkVmFsdWUpIHtcbiAgICBpZiAoQXJyYXkuaXNBcnJheShlbnRyeSkpIHtcbiAgICAgIGZvciAoY29uc3QgZSBvZiBlbnRyeSkge1xuICAgICAgICByZWN1cnNpdmVseUFkZE1vZHVsZXMoZSk7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChlbnRyeSBpbnN0YW5jZW9mIE1hcCkge1xuICAgICAgaWYgKGVudHJ5LmhhcygnbmdNb2R1bGUnKSkge1xuICAgICAgICByZWN1cnNpdmVseUFkZE1vZHVsZXMoZW50cnkuZ2V0KCduZ01vZHVsZScpISk7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmICgoZW50cnkgaW5zdGFuY2VvZiBSZWZlcmVuY2UpICYmIGhhc0lkZW50aWZpZXIoZW50cnkubm9kZSkpIHtcbiAgICAgIGNvbnN0IGZpbGVQYXRoID0gZW50cnkubm9kZS5nZXRTb3VyY2VGaWxlKCkuZmlsZU5hbWU7XG4gICAgICBjb25zdCBtb2R1bGVOYW1lID0gZW50cnkubm9kZS5uYW1lLnRleHQ7XG4gICAgICBjYW5kaWRhdGVNb2R1bGVLZXlzLnB1c2goZW50cnlQb2ludEtleUZvcihmaWxlUGF0aCwgbW9kdWxlTmFtZSkpO1xuICAgIH1cbiAgfVxuXG4gIHJlY3Vyc2l2ZWx5QWRkTW9kdWxlcyhlbnRyaWVzKTtcbiAgcmV0dXJuIGNhbmRpZGF0ZU1vZHVsZUtleXM7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzY2FuRm9yUm91dGVFbnRyeVBvaW50cyhcbiAgICBuZ01vZHVsZTogdHMuU291cmNlRmlsZSwgbW9kdWxlTmFtZTogc3RyaW5nLCBkYXRhOiBOZ01vZHVsZVJhd1JvdXRlRGF0YSxcbiAgICBlbnRyeVBvaW50TWFuYWdlcjogUm91dGVyRW50cnlQb2ludE1hbmFnZXIsIGV2YWx1YXRvcjogUGFydGlhbEV2YWx1YXRvcik6IExhenlSb3V0ZUVudHJ5W10ge1xuICBjb25zdCBsb2FkQ2hpbGRyZW5JZGVudGlmaWVyczogc3RyaW5nW10gPSBbXTtcbiAgY29uc3QgZnJvbSA9IGVudHJ5UG9pbnRNYW5hZ2VyLmZyb21OZ01vZHVsZShuZ01vZHVsZSwgbW9kdWxlTmFtZSk7XG4gIGlmIChkYXRhLnByb3ZpZGVycyAhPT0gbnVsbCkge1xuICAgIGxvYWRDaGlsZHJlbklkZW50aWZpZXJzLnB1c2goLi4uc2NhbkZvclByb3ZpZGVycyhkYXRhLnByb3ZpZGVycywgZXZhbHVhdG9yKSk7XG4gIH1cbiAgaWYgKGRhdGEuaW1wb3J0cyAhPT0gbnVsbCkge1xuICAgIGxvYWRDaGlsZHJlbklkZW50aWZpZXJzLnB1c2goLi4uc2NhbkZvclJvdXRlck1vZHVsZVVzYWdlKGRhdGEuaW1wb3J0cywgZXZhbHVhdG9yKSk7XG4gIH1cbiAgaWYgKGRhdGEuZXhwb3J0cyAhPT0gbnVsbCkge1xuICAgIGxvYWRDaGlsZHJlbklkZW50aWZpZXJzLnB1c2goLi4uc2NhbkZvclJvdXRlck1vZHVsZVVzYWdlKGRhdGEuZXhwb3J0cywgZXZhbHVhdG9yKSk7XG4gIH1cbiAgY29uc3Qgcm91dGVzOiBMYXp5Um91dGVFbnRyeVtdID0gW107XG4gIGZvciAoY29uc3QgbG9hZENoaWxkcmVuIG9mIGxvYWRDaGlsZHJlbklkZW50aWZpZXJzKSB7XG4gICAgY29uc3QgcmVzb2x2ZWRUbyA9IGVudHJ5UG9pbnRNYW5hZ2VyLnJlc29sdmVMb2FkQ2hpbGRyZW5JZGVudGlmaWVyKGxvYWRDaGlsZHJlbiwgbmdNb2R1bGUpO1xuICAgIGlmIChyZXNvbHZlZFRvICE9PSBudWxsKSB7XG4gICAgICByb3V0ZXMucHVzaCh7XG4gICAgICAgIGxvYWRDaGlsZHJlbixcbiAgICAgICAgZnJvbSxcbiAgICAgICAgcmVzb2x2ZWRUbyxcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuICByZXR1cm4gcm91dGVzO1xufVxuXG5mdW5jdGlvbiBzY2FuRm9yUHJvdmlkZXJzKGV4cHI6IHRzLkV4cHJlc3Npb24sIGV2YWx1YXRvcjogUGFydGlhbEV2YWx1YXRvcik6IHN0cmluZ1tdIHtcbiAgY29uc3QgbG9hZENoaWxkcmVuSWRlbnRpZmllcnM6IHN0cmluZ1tdID0gW107XG4gIGNvbnN0IHByb3ZpZGVycyA9IGV2YWx1YXRvci5ldmFsdWF0ZShleHByKTtcblxuICBmdW5jdGlvbiByZWN1cnNpdmVseUFkZFByb3ZpZGVycyhwcm92aWRlcjogUmVzb2x2ZWRWYWx1ZSk6IHZvaWQge1xuICAgIGlmIChBcnJheS5pc0FycmF5KHByb3ZpZGVyKSkge1xuICAgICAgZm9yIChjb25zdCBlbnRyeSBvZiBwcm92aWRlcikge1xuICAgICAgICByZWN1cnNpdmVseUFkZFByb3ZpZGVycyhlbnRyeSk7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChwcm92aWRlciBpbnN0YW5jZW9mIE1hcCkge1xuICAgICAgaWYgKHByb3ZpZGVyLmhhcygncHJvdmlkZScpICYmIHByb3ZpZGVyLmhhcygndXNlVmFsdWUnKSkge1xuICAgICAgICBjb25zdCBwcm92aWRlID0gcHJvdmlkZXIuZ2V0KCdwcm92aWRlJyk7XG4gICAgICAgIGNvbnN0IHVzZVZhbHVlID0gcHJvdmlkZXIuZ2V0KCd1c2VWYWx1ZScpO1xuICAgICAgICBpZiAoaXNSb3V0ZVRva2VuKHByb3ZpZGUpICYmIEFycmF5LmlzQXJyYXkodXNlVmFsdWUpKSB7XG4gICAgICAgICAgbG9hZENoaWxkcmVuSWRlbnRpZmllcnMucHVzaCguLi5zY2FuRm9yTGF6eVJvdXRlcyh1c2VWYWx1ZSkpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmVjdXJzaXZlbHlBZGRQcm92aWRlcnMocHJvdmlkZXJzKTtcbiAgcmV0dXJuIGxvYWRDaGlsZHJlbklkZW50aWZpZXJzO1xufVxuXG5mdW5jdGlvbiBzY2FuRm9yUm91dGVyTW9kdWxlVXNhZ2UoZXhwcjogdHMuRXhwcmVzc2lvbiwgZXZhbHVhdG9yOiBQYXJ0aWFsRXZhbHVhdG9yKTogc3RyaW5nW10ge1xuICBjb25zdCBsb2FkQ2hpbGRyZW5JZGVudGlmaWVyczogc3RyaW5nW10gPSBbXTtcbiAgY29uc3QgaW1wb3J0cyA9IGV2YWx1YXRvci5ldmFsdWF0ZShleHByLCByb3V0ZXJNb2R1bGVGRlIpO1xuXG4gIGZ1bmN0aW9uIHJlY3Vyc2l2ZWx5QWRkUm91dGVzKGltcDogUmVzb2x2ZWRWYWx1ZSkge1xuICAgIGlmIChBcnJheS5pc0FycmF5KGltcCkpIHtcbiAgICAgIGZvciAoY29uc3QgZW50cnkgb2YgaW1wKSB7XG4gICAgICAgIHJlY3Vyc2l2ZWx5QWRkUm91dGVzKGVudHJ5KTtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKGltcCBpbnN0YW5jZW9mIE1hcCkge1xuICAgICAgaWYgKGltcC5oYXMoUk9VVEVTX01BUktFUikgJiYgaW1wLmhhcygncm91dGVzJykpIHtcbiAgICAgICAgY29uc3Qgcm91dGVzID0gaW1wLmdldCgncm91dGVzJyk7XG4gICAgICAgIGlmIChBcnJheS5pc0FycmF5KHJvdXRlcykpIHtcbiAgICAgICAgICBsb2FkQ2hpbGRyZW5JZGVudGlmaWVycy5wdXNoKC4uLnNjYW5Gb3JMYXp5Um91dGVzKHJvdXRlcykpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmVjdXJzaXZlbHlBZGRSb3V0ZXMoaW1wb3J0cyk7XG4gIHJldHVybiBsb2FkQ2hpbGRyZW5JZGVudGlmaWVycztcbn1cblxuZnVuY3Rpb24gc2NhbkZvckxhenlSb3V0ZXMocm91dGVzOiBSZXNvbHZlZFZhbHVlW10pOiBzdHJpbmdbXSB7XG4gIGNvbnN0IGxvYWRDaGlsZHJlbklkZW50aWZpZXJzOiBzdHJpbmdbXSA9IFtdO1xuXG4gIGZ1bmN0aW9uIHJlY3Vyc2l2ZWx5U2NhblJvdXRlcyhyb3V0ZXM6IFJlc29sdmVkVmFsdWVbXSk6IHZvaWQge1xuICAgIGZvciAobGV0IHJvdXRlIG9mIHJvdXRlcykge1xuICAgICAgaWYgKCEocm91dGUgaW5zdGFuY2VvZiBNYXApKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgaWYgKHJvdXRlLmhhcygnbG9hZENoaWxkcmVuJykpIHtcbiAgICAgICAgY29uc3QgbG9hZENoaWxkcmVuID0gcm91dGUuZ2V0KCdsb2FkQ2hpbGRyZW4nKTtcbiAgICAgICAgaWYgKHR5cGVvZiBsb2FkQ2hpbGRyZW4gPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgbG9hZENoaWxkcmVuSWRlbnRpZmllcnMucHVzaChsb2FkQ2hpbGRyZW4pO1xuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKHJvdXRlLmhhcygnY2hpbGRyZW4nKSkge1xuICAgICAgICBjb25zdCBjaGlsZHJlbiA9IHJvdXRlLmdldCgnY2hpbGRyZW4nKTtcbiAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkoY2hpbGRyZW4pKSB7XG4gICAgICAgICAgcmVjdXJzaXZlbHlTY2FuUm91dGVzKGNoaWxkcmVuKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJlY3Vyc2l2ZWx5U2NhblJvdXRlcyhyb3V0ZXMpO1xuICByZXR1cm4gbG9hZENoaWxkcmVuSWRlbnRpZmllcnM7XG59XG5cbi8qKlxuICogQSBmb3JlaWduIGZ1bmN0aW9uIHJlc29sdmVyIHRoYXQgY29udmVydHMgYFJvdXRlck1vZHVsZS5mb3JSb290L2ZvckNoaWxkKFgpYCB0byBhIHNwZWNpYWwgb2JqZWN0XG4gKiBvZiB0aGUgZm9ybSBge19fbmdSb3V0ZXNNYXJrZXJfXzogdHJ1ZSwgcm91dGVzOiBYfWAuXG4gKlxuICogVGhlc2Ugb2JqZWN0cyBhcmUgdGhlbiByZWNvZ25pemFibGUgaW5zaWRlIHRoZSBsYXJnZXIgc2V0IG9mIGltcG9ydHMvZXhwb3J0cy5cbiAqL1xuY29uc3Qgcm91dGVyTW9kdWxlRkZSOiBGb3JlaWduRnVuY3Rpb25SZXNvbHZlciA9XG4gICAgZnVuY3Rpb24gcm91dGVyTW9kdWxlRkZSKFxuICAgICAgICByZWY6IFJlZmVyZW5jZTx0cy5GdW5jdGlvbkRlY2xhcmF0aW9ufHRzLk1ldGhvZERlY2xhcmF0aW9ufHRzLkZ1bmN0aW9uRXhwcmVzc2lvbj4sXG4gICAgICAgIGFyZ3M6IFJlYWRvbmx5QXJyYXk8dHMuRXhwcmVzc2lvbj4pOiB0cy5FeHByZXNzaW9ufG51bGwge1xuICBpZiAoIWlzTWV0aG9kTm9kZVJlZmVyZW5jZShyZWYpIHx8ICF0cy5pc0NsYXNzRGVjbGFyYXRpb24ocmVmLm5vZGUucGFyZW50KSkge1xuICAgIHJldHVybiBudWxsO1xuICB9IGVsc2UgaWYgKFxuICAgICAgcmVmLmJlc3RHdWVzc093bmluZ01vZHVsZSA9PT0gbnVsbCB8fFxuICAgICAgcmVmLmJlc3RHdWVzc093bmluZ01vZHVsZS5zcGVjaWZpZXIgIT09ICdAYW5ndWxhci9yb3V0ZXInKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH0gZWxzZSBpZiAocmVmLm5vZGUucGFyZW50Lm5hbWUgPT09IHVuZGVmaW5lZCB8fCByZWYubm9kZS5wYXJlbnQubmFtZS50ZXh0ICE9PSAnUm91dGVyTW9kdWxlJykge1xuICAgIHJldHVybiBudWxsO1xuICB9IGVsc2UgaWYgKFxuICAgICAgIXRzLmlzSWRlbnRpZmllcihyZWYubm9kZS5uYW1lKSB8fFxuICAgICAgKHJlZi5ub2RlLm5hbWUudGV4dCAhPT0gJ2ZvclJvb3QnICYmIHJlZi5ub2RlLm5hbWUudGV4dCAhPT0gJ2ZvckNoaWxkJykpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIGNvbnN0IHJvdXRlcyA9IGFyZ3NbMF07XG4gIHJldHVybiB0cy5jcmVhdGVPYmplY3RMaXRlcmFsKFtcbiAgICB0cy5jcmVhdGVQcm9wZXJ0eUFzc2lnbm1lbnQoUk9VVEVTX01BUktFUiwgdHMuY3JlYXRlVHJ1ZSgpKSxcbiAgICB0cy5jcmVhdGVQcm9wZXJ0eUFzc2lnbm1lbnQoJ3JvdXRlcycsIHJvdXRlcyksXG4gIF0pO1xufTtcblxuZnVuY3Rpb24gaGFzSWRlbnRpZmllcihub2RlOiB0cy5Ob2RlKTogbm9kZSBpcyB0cy5Ob2RlJntuYW1lOiB0cy5JZGVudGlmaWVyfSB7XG4gIGNvbnN0IG5vZGVfID0gbm9kZSBhcyB0cy5OYW1lZERlY2xhcmF0aW9uO1xuICByZXR1cm4gKG5vZGVfLm5hbWUgIT09IHVuZGVmaW5lZCkgJiYgdHMuaXNJZGVudGlmaWVyKG5vZGVfLm5hbWUpO1xufVxuXG5mdW5jdGlvbiBpc01ldGhvZE5vZGVSZWZlcmVuY2UoXG4gICAgcmVmOiBSZWZlcmVuY2U8dHMuRnVuY3Rpb25EZWNsYXJhdGlvbnx0cy5NZXRob2REZWNsYXJhdGlvbnx0cy5GdW5jdGlvbkV4cHJlc3Npb24+KTpcbiAgICByZWYgaXMgUmVmZXJlbmNlPHRzLk1ldGhvZERlY2xhcmF0aW9uPiB7XG4gIHJldHVybiB0cy5pc01ldGhvZERlY2xhcmF0aW9uKHJlZi5ub2RlKTtcbn1cblxuZnVuY3Rpb24gaXNSb3V0ZVRva2VuKHJlZjogUmVzb2x2ZWRWYWx1ZSk6IGJvb2xlYW4ge1xuICByZXR1cm4gcmVmIGluc3RhbmNlb2YgUmVmZXJlbmNlICYmIHJlZi5iZXN0R3Vlc3NPd25pbmdNb2R1bGUgIT09IG51bGwgJiZcbiAgICAgIHJlZi5iZXN0R3Vlc3NPd25pbmdNb2R1bGUuc3BlY2lmaWVyID09PSAnQGFuZ3VsYXIvcm91dGVyJyAmJiByZWYuZGVidWdOYW1lID09PSAnUk9VVEVTJztcbn1cbiJdfQ==