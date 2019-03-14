/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/// <amd-module name="@angular/compiler-cli/src/ngtsc/annotations/src/pipe" />
import { R3PipeMetadata, Statement } from '@angular/compiler';
import * as ts from 'typescript';
import { DefaultImportRecorder } from '../../imports';
import { PartialEvaluator } from '../../partial_evaluator';
import { Decorator, ReflectionHost } from '../../reflection';
import { LocalModuleScopeRegistry } from '../../scope/src/local';
import { AnalysisOutput, CompileResult, DecoratorHandler, DetectResult, HandlerPrecedence } from '../../transform';
export interface PipeHandlerData {
    meta: R3PipeMetadata;
    metadataStmt: Statement | null;
}
export declare class PipeDecoratorHandler implements DecoratorHandler<PipeHandlerData, Decorator> {
    private reflector;
    private evaluator;
    private scopeRegistry;
    private defaultImportRecorder;
    private isCore;
    constructor(reflector: ReflectionHost, evaluator: PartialEvaluator, scopeRegistry: LocalModuleScopeRegistry, defaultImportRecorder: DefaultImportRecorder, isCore: boolean);
    readonly precedence = HandlerPrecedence.PRIMARY;
    detect(node: ts.Declaration, decorators: Decorator[] | null): DetectResult<Decorator> | undefined;
    analyze(clazz: ts.ClassDeclaration, decorator: Decorator): AnalysisOutput<PipeHandlerData>;
    compile(node: ts.ClassDeclaration, analysis: PipeHandlerData): CompileResult;
}
