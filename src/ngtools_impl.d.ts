import { StaticReflector, AotCompilerHost } from '@angular/compiler';
export interface LazyRoute {
    routeDef: RouteDef;
    absoluteFilePath: string;
}
export declare type LazyRouteMap = {
    [route: string]: LazyRoute;
};
export declare class RouteDef {
    path: string;
    className: string;
    private constructor(path, className?);
    toString(): string;
    static fromString(entry: string): RouteDef;
}
/**
 *
 * @returns {LazyRouteMap}
 * @private
 */
export declare function listLazyRoutesOfModule(entryModule: string, host: AotCompilerHost, reflector: StaticReflector): LazyRouteMap;
