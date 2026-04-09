/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import { AST } from '@angular/compiler';
import { TypeCheckingConfig } from '../api';
import { TcbExpr } from './ops/codegen';
/**
 * Convert an `AST` to a `TcbExpr` directly, without going through an intermediate `Expression`
 * AST.
 */
export declare function astToTcbExpr(ast: AST, maybeResolve: (ast: AST) => TcbExpr | null, config: TypeCheckingConfig): TcbExpr;
