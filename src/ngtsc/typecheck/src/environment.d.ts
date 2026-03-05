/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import ts from 'typescript';
import { Reference, ReferenceEmitter } from '../../imports';
import { ClassDeclaration, ReflectionHost } from '../../reflection';
import { ImportManager } from '../../translator';
import { TcbDirectiveMetadata, TcbPipeMetadata, TcbReferenceKey, TcbReferenceMetadata, TypeCheckingConfig } from '../api';
import { ReferenceEmitEnvironment } from './reference_emit_environment';
import { TcbExpr } from './ops/codegen';
/**
 * A context which hosts one or more Type Check Blocks (TCBs).
 *
 * An `Environment` supports the generation of TCBs by tracking necessary imports, declarations of
 * type constructors, and other statements beyond the type-checking code within the TCB itself.
 * Through method calls on `Environment`, the TCB generator can request `ts.Expression`s which
 * reference declarations in the `Environment` for these artifacts`.
 *
 * `Environment` can be used in a standalone fashion, or can be extended to support more specialized
 * usage.
 */
export declare class Environment extends ReferenceEmitEnvironment {
    readonly config: TypeCheckingConfig;
    private nextIds;
    private typeCtors;
    protected typeCtorStatements: TcbExpr[];
    private pipeInsts;
    protected pipeInstStatements: TcbExpr[];
    constructor(config: TypeCheckingConfig, importManager: ImportManager, refEmitter: ReferenceEmitter, reflector: ReflectionHost, contextFile: ts.SourceFile);
    /**
     * Get an expression referring to a type constructor for the given directive.
     *
     * Depending on the shape of the directive itself, this could be either a reference to a declared
     * type constructor, or to an inline type constructor.
     */
    typeCtorFor(dir: TcbDirectiveMetadata): TcbExpr;
    pipeInst(pipe: TcbPipeMetadata): TcbExpr;
    /**
     * Generate a `ts.Expression` that references the given node.
     *
     * This may involve importing the node into the file if it's not declared there already.
     */
    reference(ref: Reference<ClassDeclaration<ts.ClassDeclaration>>): TcbExpr;
    private emitTypeParameters;
    getPreludeStatements(): TcbExpr[];
}
export declare function getTcbReferenceKey(ref: TcbReferenceMetadata): TcbReferenceKey;
