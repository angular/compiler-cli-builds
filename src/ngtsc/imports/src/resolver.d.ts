/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/// <amd-module name="@angular/compiler-cli/src/ngtsc/imports/src/resolver" />
import * as ts from 'typescript';
import { Reference } from './references';
export interface ReferenceResolver {
    resolve(decl: ts.Declaration, importFromHint: string | null, fromFile: string): Reference<ts.Declaration>;
}
export declare class TsReferenceResolver implements ReferenceResolver {
    private program;
    private checker;
    private options;
    private host;
    private moduleExportsCache;
    constructor(program: ts.Program, checker: ts.TypeChecker, options: ts.CompilerOptions, host: ts.CompilerHost);
    resolve(decl: ts.Declaration, importFromHint: string | null, fromFile: string): Reference<ts.Declaration>;
    private resolveImportName;
    private getExportsOfModule;
    private enumerateExportsOfModule;
}
