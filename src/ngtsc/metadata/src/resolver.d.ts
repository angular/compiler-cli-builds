/// <amd-module name="@angular/compiler-cli/src/ngtsc/metadata/src/resolver" />
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/**
 * resolver.ts implements partial computation of expressions, resolving expressions to static
 * values where possible and returning a `DynamicValue` signal when not.
 */
import * as ts from 'typescript';
/**
 * Represents a value which cannot be determined statically.
 *
 * Use `isDynamicValue` to determine whether a `ResolvedValue` is a `DynamicValue`.
 */
export declare class DynamicValue {
    /**
     * This is needed so the "is DynamicValue" assertion of `isDynamicValue` actually has meaning.
     *
     * Otherwise, "is DynamicValue" is akin to "is {}" which doesn't trigger narrowing.
     */
    private _isDynamic;
}
/**
 * Used to test whether a `ResolvedValue` is a `DynamicValue`.
 */
export declare function isDynamicValue(value: any): value is DynamicValue;
/**
 * A value resulting from static resolution.
 *
 * This could be a primitive, collection type, reference to a `ts.Node` that declares a
 * non-primitive value, or a special `DynamicValue` type which indicates the value was not
 * available statically.
 */
export declare type ResolvedValue = number | boolean | string | null | undefined | Reference | ResolvedValueArray | ResolvedValueMap | DynamicValue;
/**
 * An array of `ResolvedValue`s.
 *
 * This is a reified type to allow the circular reference of `ResolvedValue` -> `ResolvedValueArray`
 * ->
 * `ResolvedValue`.
 */
export interface ResolvedValueArray extends Array<ResolvedValue> {
}
/**
 * A map of strings to `ResolvedValue`s.
 *
 * This is a reified type to allow the circular reference of `ResolvedValue` -> `ResolvedValueMap` ->
 * `ResolvedValue`.
 */ export interface ResolvedValueMap extends Map<string, ResolvedValue> {
}
/**
 * A reference to a `ts.Node`.
 *
 * For example, if an expression evaluates to a function or class definition, it will be returned
 * as a `Reference` (assuming references are allowed in evaluation).
 */
export declare class Reference {
    readonly node: ts.Node;
    constructor(node: ts.Node);
}
/**
 * Statically resolve the given `ts.Expression` into a `ResolvedValue`.
 *
 * @param node the expression to statically resolve if possible
 * @param checker a `ts.TypeChecker` used to understand the expression
 * @returns a `ResolvedValue` representing the resolved value
 */
export declare function staticallyResolve(node: ts.Expression, checker: ts.TypeChecker): ResolvedValue;
