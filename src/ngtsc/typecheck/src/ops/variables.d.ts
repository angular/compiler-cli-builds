/*!
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import { TmplAstTemplate, TmplAstVariable } from '@angular/compiler';
import { TcbOp } from './base';
import type { Context } from './context';
import type { Scope } from './scope';
import { TcbExpr } from './codegen';
/**
 * A `TcbOp` which renders a variable that is implicitly available within a block (e.g. `$count`
 * in a `@for` block).
 *
 * Executing this operation returns the identifier which can be used to refer to the variable.
 */
export declare class TcbBlockImplicitVariableOp extends TcbOp {
    private tcb;
    private scope;
    private type;
    private variable;
    constructor(tcb: Context, scope: Scope, type: TcbExpr, variable: TmplAstVariable);
    readonly optional = true;
    execute(): TcbExpr;
}
/**
 * A `TcbOp` which creates an expression for particular let- `TmplAstVariable` on a
 * `TmplAstTemplate`'s context.
 *
 * Executing this operation returns a reference to the variable variable (lol).
 */
export declare class TcbTemplateVariableOp extends TcbOp {
    private tcb;
    private scope;
    private template;
    private variable;
    constructor(tcb: Context, scope: Scope, template: TmplAstTemplate, variable: TmplAstVariable);
    get optional(): boolean;
    execute(): TcbExpr;
}
/**
 * A `TcbOp` which renders a variable defined inside of block syntax (e.g. `@if (expr; as var) {}`).
 *
 * Executing this operation returns the identifier which can be used to refer to the variable.
 */
export declare class TcbBlockVariableOp extends TcbOp {
    private tcb;
    private scope;
    private initializer;
    private variable;
    constructor(tcb: Context, scope: Scope, initializer: TcbExpr, variable: TmplAstVariable);
    get optional(): boolean;
    execute(): TcbExpr;
}
