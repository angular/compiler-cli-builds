/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { FunctionEntry } from '@angular/compiler-cli/src/ngtsc/docs/src/entities';
import ts from 'typescript';
export declare class FunctionExtractor {
    private declaration;
    private typeChecker;
    constructor(declaration: ts.FunctionDeclaration | ts.MethodDeclaration, typeChecker: ts.TypeChecker);
    extract(): FunctionEntry;
    private extractAllParams;
}
