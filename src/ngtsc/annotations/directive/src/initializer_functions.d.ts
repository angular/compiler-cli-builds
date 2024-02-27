/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import ts from 'typescript';
import { ImportedSymbolsTracker } from '../../../imports';
import { ClassMember, ReflectionHost } from '../../../reflection';
/**
 * @fileoverview
 *
 * Angular exposes functions that can be used as class member initializers
 * to make use of various APIs. Those are called initializer APIs.
 *
 * Signal-based inputs are relying on initializer APIs because such inputs
 * are declared using `input` and `input.required` intersection functions.
 * Similarly, signal-based queries follow the same pattern and are also
 * declared through initializer APIs.
 */
export type InitializerApiFunction = 'input' | 'model' | 'ɵoutput' | 'output' | 'viewChild' | 'viewChildren' | 'contentChild' | 'contentChildren';
/**
 * Metadata describing an Angular class member that was recognized through
 * a function initializer. Like `input`, `input.required` or `viewChild`.
 */
interface InitializerFunctionMetadata {
    /** Name of the initializer API function that was recognized. */
    apiName: InitializerApiFunction;
    /** Node referring to the call expression. */
    call: ts.CallExpression;
    /** Whether the initializer is required or not. E.g. `input.required` was used. */
    isRequired: boolean;
}
/**
 * Attempts to identify an Angular class member that is declared via
 * its initializer referring to a given initializer API function.
 *
 * Note that multiple possible initializer API function names can be specified,
 * allowing for checking multiple types in one pass.
 */
export declare function tryParseInitializerApiMember<FnNames extends InitializerApiFunction[]>(fnNames: FnNames, member: Pick<ClassMember, 'value'>, reflector: ReflectionHost, importTracker: ImportedSymbolsTracker): InitializerFunctionMetadata | null;
export {};
