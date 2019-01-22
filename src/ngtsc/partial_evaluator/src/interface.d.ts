/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/// <amd-module name="@angular/compiler-cli/src/ngtsc/partial_evaluator/src/interface" />
import * as ts from 'typescript';
import { Reference, ReferenceResolver } from '../../imports';
import { ReflectionHost } from '../../reflection';
import { ResolvedValue } from './result';
export declare type ForeignFunctionResolver = (node: Reference<ts.FunctionDeclaration | ts.MethodDeclaration | ts.FunctionExpression>, args: ReadonlyArray<ts.Expression>) => ts.Expression | null;
export declare class PartialEvaluator {
    private host;
    private checker;
    private refResolver;
    constructor(host: ReflectionHost, checker: ts.TypeChecker, refResolver: ReferenceResolver);
    evaluate(expr: ts.Expression, foreignFunctionResolver?: ForeignFunctionResolver): ResolvedValue;
}
