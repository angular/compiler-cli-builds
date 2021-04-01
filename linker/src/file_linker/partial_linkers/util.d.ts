/// <amd-module name="@angular/compiler-cli/linker/src/file_linker/partial_linkers/util" />
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { R3Reference } from '@angular/compiler';
import * as o from '@angular/compiler/src/output/output_ast';
import { AstValue } from '../../ast/ast_value';
export declare function wrapReference<TExpression>(wrapped: o.WrappedNodeExpr<TExpression>): R3Reference;
/**
 * Parses the value of an enum from the AST value's symbol name.
 */
export declare function parseEnum<TExpression, TEnum>(value: AstValue<unknown, TExpression>, Enum: TEnum): TEnum[keyof TEnum];
