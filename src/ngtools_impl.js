/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
"use strict";
/**
 * This is a private API for the ngtools toolkit.
 *
 * This API should be stable for NG 2. It can be removed in NG 4..., but should be replaced by
 * something else.
 */
const compiler_1 = require('@angular/compiler');
const core_1 = require('@angular/core');
const ROUTER_MODULE_PATH = '@angular/router/src/router_config_loader';
const ROUTER_ROUTES_SYMBOL_NAME = 'ROUTES';
// A route definition. Normally the short form 'path/to/module#ModuleClassName' is used by
// the user, and this is a helper class to extract information from it.
class RouteDef {
    constructor(path, className = null) {
        this.path = path;
        this.className = className;
    }
    toString() {
        return (this.className === null || this.className == 'default') ?
            this.path :
            `${this.path}#${this.className}`;
    }
    static fromString(entry) {
        const split = entry.split('#');
        return new RouteDef(split[0], split[1] || null);
    }
}
exports.RouteDef = RouteDef;
/**
 *
 * @returns {LazyRouteMap}
 * @private
 */
function listLazyRoutesOfModule(entryModule, host, reflector) {
    const entryRouteDef = RouteDef.fromString(entryModule);
    const containingFile = _resolveModule(entryRouteDef.path, entryRouteDef.path, host);
    const modulePath = `./${containingFile.replace(/^(.*)\//, '')}`;
    const className = entryRouteDef.className;
    // List loadChildren of this single module.
    const appStaticSymbol = reflector.findDeclaration(modulePath, className, containingFile);
    const ROUTES = reflector.findDeclaration(ROUTER_MODULE_PATH, ROUTER_ROUTES_SYMBOL_NAME);
    const lazyRoutes = _extractLazyRoutesFromStaticModule(appStaticSymbol, reflector, host, ROUTES);
    const allLazyRoutes = lazyRoutes.reduce(function includeLazyRouteAndSubRoutes(allRoutes, lazyRoute) {
        const route = lazyRoute.routeDef.toString();
        _assertRoute(allRoutes, lazyRoute);
        allRoutes[route] = lazyRoute;
        // StaticReflector does not support discovering annotations like `NgModule` on default
        // exports
        // Which means: if a default export NgModule was lazy-loaded, we can discover it, but,
        //  we cannot parse its routes to see if they have loadChildren or not.
        if (!lazyRoute.routeDef.className) {
            return allRoutes;
        }
        const lazyModuleSymbol = reflector.findDeclaration(lazyRoute.absoluteFilePath, lazyRoute.routeDef.className || 'default');
        const subRoutes = _extractLazyRoutesFromStaticModule(lazyModuleSymbol, reflector, host, ROUTES);
        return subRoutes.reduce(includeLazyRouteAndSubRoutes, allRoutes);
    }, {});
    return allLazyRoutes;
}
exports.listLazyRoutesOfModule = listLazyRoutesOfModule;
/**
 * Try to resolve a module, and returns its absolute path.
 * @private
 */
function _resolveModule(modulePath, containingFile, host) {
    const result = host.moduleNameToFileName(modulePath, containingFile);
    if (!result) {
        throw new Error(`Could not resolve "${modulePath}" from "${containingFile}".`);
    }
    return result;
}
/**
 * Throw an exception if a route is in a route map, but does not point to the same module.
 * @private
 */
function _assertRoute(map, route) {
    const r = route.routeDef.toString();
    if (map[r] && map[r].absoluteFilePath != route.absoluteFilePath) {
        throw new Error(`Duplicated path in loadChildren detected: "${r}" is used in 2 loadChildren, ` +
            `but they point to different modules "(${map[r].absoluteFilePath} and ` +
            `"${route.absoluteFilePath}"). Webpack cannot distinguish on context and would fail to ` +
            'load the proper one.');
    }
}
/**
 * Extract all the LazyRoutes from a module. This extracts all `loadChildren` keys from this
 * module and all statically referred modules.
 * @private
 */
function _extractLazyRoutesFromStaticModule(staticSymbol, reflector, host, ROUTES) {
    const moduleMetadata = _getNgModuleMetadata(staticSymbol, reflector);
    const allRoutes = (moduleMetadata.imports || [])
        .filter(i => 'providers' in i)
        .reduce((mem, m) => {
        return mem.concat(_collectRoutes(m.providers || [], reflector, ROUTES));
    }, _collectRoutes(moduleMetadata.providers || [], reflector, ROUTES));
    const lazyRoutes = _collectLoadChildren(allRoutes).reduce((acc, route) => {
        const routeDef = RouteDef.fromString(route);
        const absoluteFilePath = _resolveModule(routeDef.path, staticSymbol.filePath, host);
        acc.push({ routeDef, absoluteFilePath });
        return acc;
    }, []);
    const importedSymbols = (moduleMetadata.imports || [])
        .filter(i => i instanceof compiler_1.StaticSymbol);
    return importedSymbols
        .reduce((acc, i) => {
        return acc.concat(_extractLazyRoutesFromStaticModule(i, reflector, host, ROUTES));
    }, [])
        .concat(lazyRoutes);
}
/**
 * Get the NgModule Metadata of a symbol.
 * @private
 */
function _getNgModuleMetadata(staticSymbol, reflector) {
    const ngModules = reflector.annotations(staticSymbol).filter((s) => s instanceof core_1.NgModule);
    if (ngModules.length === 0) {
        throw new Error(`${staticSymbol.name} is not an NgModule`);
    }
    return ngModules[0];
}
/**
 * Return the routes from the provider list.
 * @private
 */
function _collectRoutes(providers, reflector, ROUTES) {
    return providers.reduce((routeList, p) => {
        if (p.provide === ROUTES) {
            return routeList.concat(p.useValue);
        }
        else if (Array.isArray(p)) {
            return routeList.concat(_collectRoutes(p, reflector, ROUTES));
        }
        else {
            return routeList;
        }
    }, []);
}
/**
 * Return the loadChildren values of a list of Route.
 * @private
 */
function _collectLoadChildren(routes) {
    return routes.reduce((m, r) => {
        if (r.loadChildren && typeof r.loadChildren === 'string') {
            return m.concat(r.loadChildren);
        }
        else if (Array.isArray(r)) {
            return m.concat(_collectLoadChildren(r));
        }
        else if (r.children) {
            return m.concat(_collectLoadChildren(r.children));
        }
        else {
            return m;
        }
    }, []);
}
//# sourceMappingURL=ngtools_impl.js.map