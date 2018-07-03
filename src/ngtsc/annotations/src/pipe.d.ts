/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/// <amd-module name="@angular/compiler-cli/src/ngtsc/annotations/src/pipe" />
import * as ts from 'typescript';
import { Decorator, ReflectionHost } from '../../host';
import { AnalysisOutput, CompileResult, DecoratorHandler } from '../../transform';
export declare class PipeDecoratorHandler implements DecoratorHandler<string> {
    private reflector;
    private isCore;
    constructor(reflector: ReflectionHost, isCore: boolean);
    detect(decorator: Decorator[]): Decorator | undefined;
    analyze(node: ts.ClassDeclaration, decorator: Decorator): AnalysisOutput<string>;
    compile(node: ts.ClassDeclaration, analysis: string): CompileResult;
}
