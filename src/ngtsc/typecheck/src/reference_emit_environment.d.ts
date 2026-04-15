/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import { TcbExpr, TcbReferenceMetadata, TransplantedType } from '@angular/compiler';
import ts from 'typescript';
import { ImportFlags, Reference, ReferenceEmitter } from '../../imports';
import { ReflectionHost } from '../../reflection';
import { ImportManager } from '../../translator';
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
     * Generates a `TcbExpr` from a `TcbReferenceMetadata` object.
     */
    referenceTcbValue(ref: TcbReferenceMetadata): TcbExpr;
    referenceExternalSymbol(moduleName: string, name: string): TcbExpr;
    /**
     * Generates a `ts.TypeNode` representing a type that is being referenced from a different place
     * in the program. Any type references inside the transplanted type will be rewritten so that
     * they can be imported in the context file.
     */
    referenceTransplantedType(type: TransplantedType<Reference<ts.TypeNode>>): ts.TypeNode;
}
