/// <amd-module name="@angular/compiler-cli/src/ngtsc/ngmodule_semantics/src/util" />
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { SemanticSymbol } from './api';
/**
 * Determines whether the provided symbols represent the same declaration.
 */
export declare function isSymbolEqual(a: SemanticSymbol, b: SemanticSymbol): boolean;
export declare function isImportPathEqual(a: string | null, b: string | null): boolean;
export declare function referenceEquality<T>(a: T, b: T): boolean;
/**
 * Determines if the provided arrays are equal to each other, using the provided equality tester
 * that is called for all entries in the array.
 */
export declare function isArrayEqual<T>(a: readonly T[] | null, b: readonly T[] | null, equalityTester?: (a: T, b: T) => boolean): boolean;
