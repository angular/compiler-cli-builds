/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/// <amd-module name="@angular/compiler-cli/src/ngtsc/annotations/src/injectable" />
import { R3InjectableMetadata, Statement } from '@angular/compiler';
import * as ts from 'typescript';
import { DefaultImportRecorder } from '../../imports';
import { Decorator, ReflectionHost } from '../../reflection';
import { AnalysisOutput, CompileResult, DecoratorHandler, DetectResult, HandlerPrecedence } from '../../transform';
export interface InjectableHandlerData {
    meta: R3InjectableMetadata;
    metadataStmt: Statement | null;
}
/**
 * Adapts the `compileIvyInjectable` compiler for `@Injectable` decorators to the Ivy compiler.
 */
export declare class InjectableDecoratorHandler implements DecoratorHandler<InjectableHandlerData, Decorator> {
    private reflector;
    private defaultImportRecorder;
    private isCore;
    private strictCtorDeps;
    constructor(reflector: ReflectionHost, defaultImportRecorder: DefaultImportRecorder, isCore: boolean, strictCtorDeps: boolean);
    readonly precedence = HandlerPrecedence.SHARED;
    detect(node: ts.Declaration, decorators: Decorator[] | null): DetectResult<Decorator> | undefined;
    analyze(node: ts.ClassDeclaration, decorator: Decorator): AnalysisOutput<InjectableHandlerData>;
    compile(node: ts.ClassDeclaration, analysis: InjectableHandlerData): CompileResult;
}
