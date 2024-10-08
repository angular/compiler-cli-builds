/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import { types as t } from '@babel/core';
import { AstHost, Range } from '../../../../linker';
/**
 * This implementation of `AstHost` is able to get information from Babel AST nodes.
 */
export declare class BabelAstHost implements AstHost<t.Expression> {
    getSymbolName(node: t.Expression): string | null;
    isStringLiteral: typeof t.isStringLiteral;
    parseStringLiteral(str: t.Expression): string;
    isNumericLiteral: typeof t.isNumericLiteral;
    parseNumericLiteral(num: t.Expression): number;
    isBooleanLiteral(bool: t.Expression): boolean;
    parseBooleanLiteral(bool: t.Expression): boolean;
    isNull(node: t.Expression): boolean;
    isArrayLiteral: typeof t.isArrayExpression;
    parseArrayLiteral(array: t.Expression): t.Expression[];
    isObjectLiteral: typeof t.isObjectExpression;
    parseObjectLiteral(obj: t.Expression): Map<string, t.Expression>;
    isFunctionExpression(node: t.Expression): node is Extract<t.Function | t.ArrowFunctionExpression, t.Expression>;
    parseReturnValue(fn: t.Expression): t.Expression;
    parseParameters(fn: t.Expression): t.Expression[];
    isCallExpression: typeof t.isCallExpression;
    parseCallee(call: t.Expression): t.Expression;
    parseArguments(call: t.Expression): t.Expression[];
    getRange(node: t.Expression): Range;
}
