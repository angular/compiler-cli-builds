/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import { TransplantedType, Type } from '@angular/compiler';
import ts from 'typescript';
import { ImportFlags, Reference, ReferenceEmitter } from '../../imports';
import { ReflectionHost } from '../../reflection';
import { ImportManager } from '../../translator';
import { TcbReferenceMetadata } from '../api';
import { TcbExpr } from './ops/codegen';
/**
 * An environment for a given source file that can be used to emit references.
 *
 * This can be used by the type-checking block, or constructor logic to generate
 * references to directives or other symbols or types.
 */
export declare class ReferenceEmitEnvironment {
    readonly importManager: ImportManager;
    refEmitter: ReferenceEmitter;
    readonly reflector: ReflectionHost;
    contextFile: ts.SourceFile;
    constructor(importManager: ImportManager, refEmitter: ReferenceEmitter, reflector: ReflectionHost, contextFile: ts.SourceFile);
    canReferenceType(ref: Reference, flags?: ImportFlags): boolean;
    /**
     * Generate a `ts.TypeNode` that references the given node as a type.
     *
     * This may involve importing the node into the file if it's not declared there already.
     */
    referenceType(ref: Reference, flags?: ImportFlags): ts.TypeNode;
    /**
     * Generates a `ts.TypeNode` from a `TcbReferenceMetadata` object.
     * This is used by the TCB operations which do not hold on to the original `ts.Declaration`.
     *
     * Note: It's important that we do not try to evaluate the `typeParameters` here and pad them
     * out with `any` type arguments. If we supply `any` to a generic pipe (e.g. `var _pipe1: MyPipe<any>;`),
     * it destroys the generic constraints and degrades the `transform` signature. When they are omitted
     * entirely, TypeScript implicitly flags an error, which the Angular compiler filters out, and
     * crucially recovers by falling back to constraint inference (e.g. `var _pipe1: MyPipe;` infers
     * bounds safely).
     */
    referenceTcbType(ref: TcbReferenceMetadata): ts.TypeNode;
    /**
     * Generates a `TcbExpr` from a `TcbReferenceMetadata` object.
     */
    referenceTcbValue(ref: TcbReferenceMetadata): TcbExpr;
    referenceExternalSymbol(moduleName: string, name: string): TcbExpr;
    /**
     * Generate a `ts.TypeNode` that references a given type from the provided module.
     *
     * This will involve importing the type into the file, and will also add type parameters if
     * provided.
     */
    referenceExternalType(moduleName: string, name: string, typeParams?: Type[]): ts.TypeNode;
    /**
     * Generates a `ts.TypeNode` representing a type that is being referenced from a different place
     * in the program. Any type references inside the transplanted type will be rewritten so that
     * they can be imported in the context file.
     */
    referenceTransplantedType(type: TransplantedType<Reference<ts.TypeNode>>): ts.TypeNode;
}
