/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/// <amd-module name="@angular/compiler-cli/src/ngtsc/annotations/src/pipe" />
import { R3PipeMetadata, Statement } from '@angular/compiler';
import { DefaultImportRecorder } from '../../imports';
import { SemanticSymbol } from '../../incremental/semantic_graph';
import { InjectableClassRegistry, MetadataRegistry } from '../../metadata';
import { PartialEvaluator } from '../../partial_evaluator';
import { ClassDeclaration, Decorator, ReflectionHost } from '../../reflection';
import { LocalModuleScopeRegistry } from '../../scope';
import { AnalysisOutput, CompileResult, DecoratorHandler, DetectResult, HandlerPrecedence, ResolveResult } from '../../transform';
export interface PipeHandlerData {
    meta: R3PipeMetadata;
    metadataStmt: Statement | null;
}
/**
 * Represents an Angular pipe.
 */
export declare class PipeSymbol extends SemanticSymbol {
    readonly name: string;
    constructor(decl: ClassDeclaration, name: string);
    isPublicApiAffected(previousSymbol: SemanticSymbol): boolean;
    isTypeCheckEmitAffected(previousSymbol: SemanticSymbol): boolean;
}
export declare class PipeDecoratorHandler implements DecoratorHandler<Decorator, PipeHandlerData, PipeSymbol, unknown> {
    private reflector;
    private evaluator;
    private metaRegistry;
    private scopeRegistry;
    private defaultImportRecorder;
    private injectableRegistry;
    private isCore;
    constructor(reflector: ReflectionHost, evaluator: PartialEvaluator, metaRegistry: MetadataRegistry, scopeRegistry: LocalModuleScopeRegistry, defaultImportRecorder: DefaultImportRecorder, injectableRegistry: InjectableClassRegistry, isCore: boolean);
    readonly precedence = HandlerPrecedence.PRIMARY;
    readonly name: string;
    detect(node: ClassDeclaration, decorators: Decorator[] | null): DetectResult<Decorator> | undefined;
    analyze(clazz: ClassDeclaration, decorator: Readonly<Decorator>): AnalysisOutput<PipeHandlerData>;
    symbol(node: ClassDeclaration, analysis: Readonly<PipeHandlerData>): PipeSymbol;
    register(node: ClassDeclaration, analysis: Readonly<PipeHandlerData>): void;
    resolve(node: ClassDeclaration): ResolveResult<unknown>;
    compileFull(node: ClassDeclaration, analysis: Readonly<PipeHandlerData>): CompileResult[];
    compilePartial(node: ClassDeclaration, analysis: Readonly<PipeHandlerData>): CompileResult[];
    private compilePipe;
}
