/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import ts from 'typescript';
import { ClassMember, ReflectionHost } from '../../../reflection';
/** Metadata describing an input declared via the `input` function. */
export interface InputMemberMetadata {
    /** Node referring to the call expression. */
    inputCall: ts.CallExpression;
    /** Node referring to the options expression, if specified. */
    optionsNode: ts.Expression | undefined;
    /** Whether the input is required or not. i.e. `input.required` was used. */
    isRequired: boolean;
}
/**
 * Attempts to identify and parse an Angular input that is declared
 * as a class member using the `input`/`input.required` functions.
 */
export declare function tryParseInputInitializerAndOptions(member: ClassMember, reflector: ReflectionHost, coreModule: string | undefined): InputMemberMetadata | null;
