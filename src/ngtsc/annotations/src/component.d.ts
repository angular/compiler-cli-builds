/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/// <amd-module name="@angular/compiler-cli/src/ngtsc/annotations/src/component" />
import { ConstantPool, R3ComponentMetadata, Statement, TmplAstNode } from '@angular/compiler';
import * as ts from 'typescript';
import { PartialEvaluator } from '../../partial_evaluator';
import { Decorator, ReflectionHost } from '../../reflection';
import { AnalysisOutput, CompileResult, DecoratorHandler } from '../../transform';
import { TypeCheckContext } from '../../typecheck';
import { ResourceLoader } from './api';
import { SelectorScopeRegistry } from './selector_scope';
export interface ComponentHandlerData {
    meta: R3ComponentMetadata;
    parsedTemplate: TmplAstNode[];
    metadataStmt: Statement | null;
}
/**
 * `DecoratorHandler` which handles the `@Component` annotation.
 */
export declare class ComponentDecoratorHandler implements DecoratorHandler<ComponentHandlerData, Decorator> {
    private reflector;
    private evaluator;
    private scopeRegistry;
    private isCore;
    private resourceLoader;
    private rootDirs;
    private defaultPreserveWhitespaces;
    private i18nUseExternalIds;
    constructor(reflector: ReflectionHost, evaluator: PartialEvaluator, scopeRegistry: SelectorScopeRegistry, isCore: boolean, resourceLoader: ResourceLoader, rootDirs: string[], defaultPreserveWhitespaces: boolean, i18nUseExternalIds: boolean);
    private literalCache;
    private elementSchemaRegistry;
    detect(node: ts.Declaration, decorators: Decorator[] | null): Decorator | undefined;
    preanalyze(node: ts.ClassDeclaration, decorator: Decorator): Promise<void> | undefined;
    analyze(node: ts.ClassDeclaration, decorator: Decorator): AnalysisOutput<ComponentHandlerData>;
    typeCheck(ctx: TypeCheckContext, node: ts.Declaration, meta: ComponentHandlerData): void;
    compile(node: ts.ClassDeclaration, analysis: ComponentHandlerData, pool: ConstantPool): CompileResult;
    private _resolveLiteral;
    private _resolveEnumValue;
    private _extractStyleUrls;
}
