/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/// <amd-module name="@angular/compiler-cli/src/ngtsc/partial_evaluator/src/builtin" />
import { BuiltinFn, ResolvedValue, ResolvedValueArray } from './result';
export declare class ArraySliceBuiltinFn extends BuiltinFn {
    private lhs;
    constructor(lhs: ResolvedValueArray);
    evaluate(args: ResolvedValueArray): ResolvedValue;
}
