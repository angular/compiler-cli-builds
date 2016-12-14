/**
 * This is a private API for the ngtools toolkit.
 *
 * This API should be stable for NG 2. It can be removed in NG 4..., but should be replaced by
 * something else.
 */
import * as ts from 'typescript';
import { AngularCompilerOptions } from '@angular/tsc-wrapped';
export interface NgTools_InternalApi_NG2_CodeGen_Options {
    basePath: string;
    compilerOptions: ts.CompilerOptions;
    program: ts.Program;
    host: ts.CompilerHost;
    angularCompilerOptions: AngularCompilerOptions;
    i18nFormat: string;
    i18nFile: string;
    locale: string;
    readResource: (fileName: string) => Promise<string>;
}
export interface NgTools_InternalApi_NG2_ListLazyRoutes_Options {
    program: ts.Program;
    host: ts.CompilerHost;
    angularCompilerOptions: AngularCompilerOptions;
    entryModule: string;
}
export interface NgTools_InternalApi_NG_2_LazyRouteMap {
    [route: string]: string;
}
/**
 * @internal
 * @private
 */
export declare class NgTools_InternalApi_NG_2 {
    /**
     * @internal
     * @private
     */
    static codeGen(options: NgTools_InternalApi_NG2_CodeGen_Options): Promise<void>;
    /**
     * @internal
     * @private
     */
    static listLazyRoutes(options: NgTools_InternalApi_NG2_ListLazyRoutes_Options): NgTools_InternalApi_NG_2_LazyRouteMap;
}
