/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/// <amd-module name="@angular/compiler-cli/src/ngtsc/annotations/src/util" />
import { R3DependencyMetadata, R3Reference } from '@angular/compiler';
import * as ts from 'typescript';
import { Reference, ReferenceEmitter } from '../../imports';
import { CtorParameter, Decorator, ReflectionHost } from '../../reflection';
export declare enum ConstructorDepErrorKind {
    NO_SUITABLE_TOKEN = 0
}
export declare type ConstructorDeps = {
    deps: R3DependencyMetadata[];
} | {
    deps: null;
    errors: ConstructorDepError[];
};
export interface ConstructorDepError {
    index: number;
    param: CtorParameter;
    kind: ConstructorDepErrorKind;
}
export declare function getConstructorDependencies(clazz: ts.ClassDeclaration, reflector: ReflectionHost, isCore: boolean): ConstructorDeps | null;
export declare function getValidConstructorDependencies(clazz: ts.ClassDeclaration, reflector: ReflectionHost, isCore: boolean): R3DependencyMetadata[] | null;
export declare function validateConstructorDependencies(clazz: ts.ClassDeclaration, deps: ConstructorDeps | null): R3DependencyMetadata[] | null;
export declare function toR3Reference(valueRef: Reference, typeRef: Reference, valueContext: ts.SourceFile, typeContext: ts.SourceFile, refEmitter: ReferenceEmitter): R3Reference;
export declare function isAngularCore(decorator: Decorator): boolean;
export declare function isAngularCoreReference(reference: Reference, symbolName: string): boolean;
/**
 * Unwrap a `ts.Expression`, removing outer type-casts or parentheses until the expression is in its
 * lowest level form.
 *
 * For example, the expression "(foo as Type)" unwraps to "foo".
 */
export declare function unwrapExpression(node: ts.Expression): ts.Expression;
/**
 * Possibly resolve a forwardRef() expression into the inner value.
 *
 * @param node the forwardRef() expression to resolve
 * @param reflector a ReflectionHost
 * @returns the resolved expression, if the original expression was a forwardRef(), or the original
 * expression otherwise
 */
export declare function unwrapForwardRef(node: ts.Expression, reflector: ReflectionHost): ts.Expression;
/**
 * A foreign function resolver for `staticallyResolve` which unwraps forwardRef() expressions.
 *
 * @param ref a Reference to the declaration of the function being called (which might be
 * forwardRef)
 * @param args the arguments to the invocation of the forwardRef expression
 * @returns an unwrapped argument if `ref` pointed to forwardRef, or null otherwise
 */
export declare function forwardRefResolver(ref: Reference<ts.FunctionDeclaration | ts.MethodDeclaration>, args: ts.Expression[]): ts.Expression | null;
