/*!
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import { R3CompiledExpression, R3ComponentDeferMetadata, R3HmrNamespaceDependency, outputAst as o } from '@angular/compiler';
import { DeclarationNode, ReflectionHost } from '../../reflection';
import { CompileResult } from '../../transform';
import { PartialEvaluator } from '../../partial_evaluator';
/**
 * The compiled output of a class that HMR inspects for the file-level dependencies it has to
 * capture.
 */
export interface HmrCompiledOutput {
    /** Compiled component definition. */
    definition: R3CompiledExpression;
    /** Compiled component factory. */
    factory: Pick<CompileResult, 'initializer' | 'statements'>;
    /** Metadata about the defer blocks in the component. */
    deferBlockMetadata: R3ComponentDeferMetadata;
    /** Compiled `setClassMetadata` expression, if any. */
    classMetadata: o.Statement | null;
    /** Compiled `setClassDebugInfo` expression, if any. */
    debugInfo: o.Statement | null;
}
/**
 * Resolves the reads a `PotentialTopLevelReadsVisitor` found to the top-level bindings they
 * refer to. `T` is the read representation of whatever is wrapped in the output's
 * `WrappedNodeExpr`s (`ts.Identifier` in ngtsc).
 */
export interface HmrReadResolver<T> {
    /** Name of the top-level binding a read refers to. */
    getName(read: o.ReadVarExpr | T): string;
    /**
     * Expression that stands in for the read in the HMR initializer's capture list, or `null` when
     * it has no runtime representation, in which case HMR is disabled for the class.
     */
    getRuntimeRepresentation(read: o.ReadVarExpr | T): o.Expression | null;
}
/** The file-level dependencies that the HMR initializer needs to capture and pass along. */
export interface HmrDependencies {
    local: {
        name: string;
        runtimeRepresentation: o.Expression;
    }[];
    external: R3HmrNamespaceDependency[];
}
/**
 * Determines the file-level dependencies that the HMR initializer needs to capture and pass along.
 * @param node Class for which we're extracting the dependencies.
 * @param definition Compiled component definition.
 * @param factory Compiled component factory.
 * @param deferBlockMetadata Metadata about the defer blocks in the component.
 * @param classMetadata Compiled `setClassMetadata` expression, if any.
 * @param debugInfo Compiled `setClassDebugInfo` expression, if any.
 */
export declare function extractHmrDependencies(node: DeclarationNode, definition: R3CompiledExpression, factory: CompileResult, deferBlockMetadata: R3ComponentDeferMetadata, classMetadata: o.Statement | null, debugInfo: o.Statement | null, reflection: ReflectionHost, evaluator: PartialEvaluator): HmrDependencies | null;
export declare function extractHmrDependenciesFromOutput<T>(className: string | null, output: HmrCompiledOutput, visitor: PotentialTopLevelReadsVisitor<T>, availableTopLevel: ReadonlySet<string>, resolver: HmrReadResolver<T>): HmrDependencies | null;
/**
 * Visitor that will traverse an AST looking for potential top-level variable reads.
 * The reads are "potential", because the visitor doesn't account for local variables
 * inside functions.
 */
export declare abstract class PotentialTopLevelReadsVisitor<T> extends o.RecursiveAstVisitor {
    readonly allReads: Set<T | o.ReadVarExpr>;
    readonly namespaceReads: Set<string>;
    visitExternalExpr(ast: o.ExternalExpr, context: any): void;
    visitReadVarExpr(ast: o.ReadVarExpr, context: any): void;
    visitWrappedNodeExpr(ast: o.WrappedNodeExpr<unknown>, context: any): void;
    protected abstract addWrappedNodeReads(node: unknown): void;
}
