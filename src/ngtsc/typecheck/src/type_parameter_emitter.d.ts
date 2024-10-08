/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import ts from 'typescript';
import { Reference } from '../../imports';
import { ReflectionHost } from '../../reflection';
/**
 * See `TypeEmitter` for more information on the emitting process.
 */
export declare class TypeParameterEmitter {
    private typeParameters;
    private reflector;
    constructor(typeParameters: ts.NodeArray<ts.TypeParameterDeclaration> | undefined, reflector: ReflectionHost);
    /**
     * Determines whether the type parameters can be emitted. If this returns true, then a call to
     * `emit` is known to succeed. Vice versa, if false is returned then `emit` should not be
     * called, as it would fail.
     */
    canEmit(canEmitReference: (ref: Reference) => boolean): boolean;
    private canEmitType;
    /**
     * Emits the type parameters using the provided emitter function for `Reference`s.
     */
    emit(emitReference: (ref: Reference) => ts.TypeNode): ts.TypeParameterDeclaration[] | undefined;
    private resolveTypeReference;
    private translateTypeReference;
    private isLocalTypeParameter;
}
