/*!
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import { BoundTarget, SchemaMetadata } from '@angular/compiler';
import { TypeCheckId, TcbDirectiveMetadata, TcbPipeMetadata, OutOfBandDiagnosticRecorder, DomSchemaChecker } from '../../api';
import { Environment } from '../environment';
/**
 * Controls how generics for the component context class will be handled during TCB generation.
 */
export declare enum TcbGenericContextBehavior {
    /**
     * References to generic parameter bounds will be emitted via the `TypeParameterEmitter`.
     *
     * The caller must verify that all parameter bounds are emittable in order to use this mode.
     */
    UseEmitter = 0,
    /**
     * Generic parameter declarations will be copied directly from the `ts.ClassDeclaration` of the
     * component class.
     *
     * The caller must only use the generated TCB code in a context where such copies will still be
     * valid, such as an inline type check block.
     */
    CopyClassNodes = 1,
    /**
     * Any generic parameters for the component context class will be set to `any`.
     *
     * Produces a less useful type, but is always safe to use.
     */
    FallbackToAny = 2
}
/**
 * Overall generation context for the type check block.
 *
 * `Context` handles operations during code generation which are global with respect to the whole
 * block. It's responsible for variable name allocation and management of any imports needed. It
 * also contains the template metadata itself.
 */
export declare class Context {
    readonly env: Environment;
    readonly domSchemaChecker: DomSchemaChecker<unknown>;
    readonly oobRecorder: OutOfBandDiagnosticRecorder<unknown>;
    readonly id: TypeCheckId;
    readonly boundTarget: BoundTarget<TcbDirectiveMetadata>;
    private pipes;
    readonly schemas: SchemaMetadata[];
    readonly hostIsStandalone: boolean;
    readonly hostPreserveWhitespaces: boolean;
    private nextId;
    constructor(env: Environment, domSchemaChecker: DomSchemaChecker<unknown>, oobRecorder: OutOfBandDiagnosticRecorder<unknown>, id: TypeCheckId, boundTarget: BoundTarget<TcbDirectiveMetadata>, pipes: Map<string, TcbPipeMetadata> | null, schemas: SchemaMetadata[], hostIsStandalone: boolean, hostPreserveWhitespaces: boolean);
    /**
     * Allocate a new variable name for use within the `Context`.
     *
     * Currently this uses a monotonically increasing counter, but in the future the variable name
     * might change depending on the type of data being stored.
     */
    allocateId(): string;
    getPipeByName(name: string): TcbPipeMetadata | null;
}
