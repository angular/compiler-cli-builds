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
    constructor(declaration: ts.FunctionDeclaration | ts.MethodDeclaration | ts.MethodSignature, typeChecker: ts.TypeChecker);
    extract(): FunctionEntry;
    private extractAllParams;
    /** Gets all overloads for the function (excluding this extractor's FunctionDeclaration). */
    getOverloads(): ts.FunctionDeclaration[];
    private getSymbol;
}
