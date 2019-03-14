/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/// <amd-module name="@angular/compiler-cli/src/ngtsc/annotations/src/directive" />
import { ConstantPool, R3DirectiveMetadata, R3QueryMetadata, Statement } from '@angular/compiler';
import * as ts from 'typescript';
import { DefaultImportRecorder } from '../../imports';
import { PartialEvaluator } from '../../partial_evaluator';
import { ClassMember, Decorator, ReflectionHost } from '../../reflection';
import { LocalModuleScopeRegistry } from '../../scope/src/local';
import { AnalysisOutput, CompileResult, DecoratorHandler, DetectResult, HandlerPrecedence } from '../../transform';
export interface DirectiveHandlerData {
    meta: R3DirectiveMetadata;
    metadataStmt: Statement | null;
}
export declare class DirectiveDecoratorHandler implements DecoratorHandler<DirectiveHandlerData, Decorator> {
    private reflector;
    private evaluator;
    private scopeRegistry;
    private defaultImportRecorder;
    private isCore;
    constructor(reflector: ReflectionHost, evaluator: PartialEvaluator, scopeRegistry: LocalModuleScopeRegistry, defaultImportRecorder: DefaultImportRecorder, isCore: boolean);
    readonly precedence = HandlerPrecedence.PRIMARY;
    detect(node: ts.Declaration, decorators: Decorator[] | null): DetectResult<Decorator> | undefined;
    analyze(node: ts.ClassDeclaration, decorator: Decorator): AnalysisOutput<DirectiveHandlerData>;
    compile(node: ts.ClassDeclaration, analysis: DirectiveHandlerData, pool: ConstantPool): CompileResult;
}
/**
 * Helper function to extract metadata from a `Directive` or `Component`.
 */
export declare function extractDirectiveMetadata(clazz: ts.ClassDeclaration, decorator: Decorator, reflector: ReflectionHost, evaluator: PartialEvaluator, defaultImportRecorder: DefaultImportRecorder, isCore: boolean, defaultSelector?: string | null): {
    decorator: Map<string, ts.Expression>;
    metadata: R3DirectiveMetadata;
    decoratedElements: ClassMember[];
} | undefined;
export declare function extractQueryMetadata(exprNode: ts.Node, name: string, args: ReadonlyArray<ts.Expression>, propertyName: string, reflector: ReflectionHost, evaluator: PartialEvaluator): R3QueryMetadata;
export declare function extractQueriesFromDecorator(queryData: ts.Expression, reflector: ReflectionHost, evaluator: PartialEvaluator, isCore: boolean): {
    content: R3QueryMetadata[];
    view: R3QueryMetadata[];
};
export declare function parseFieldArrayValue(directive: Map<string, ts.Expression>, field: string, evaluator: PartialEvaluator): null | string[];
export declare function queriesFromFields(fields: {
    member: ClassMember;
    decorators: Decorator[];
}[], reflector: ReflectionHost, evaluator: PartialEvaluator): R3QueryMetadata[];
