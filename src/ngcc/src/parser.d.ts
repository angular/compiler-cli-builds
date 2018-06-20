/// <amd-module name="angular/packages/compiler-cli/src/ngcc/src/parser" />
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as ts from 'typescript';
import { Decorator } from '../../ngtsc/host';
import { NgccReflectionHost } from './host/ngcc_host';
export interface DecoratedClass {
    classNode: ts.Node;
    decorators: Decorator[];
}
export declare class PackageParser {
    private reflectionHost;
    constructor(reflectionHost: NgccReflectionHost);
    /**
     * Search the AST of the specified source file, looking for classes that have been decorated.
     * @param entryPoint The source file containing the exports to find.
     * @returns an array containing the decorated classes found in this file.
     */
    getDecoratedClasses(entryPoint: ts.SourceFile): DecoratedClass[];
}
