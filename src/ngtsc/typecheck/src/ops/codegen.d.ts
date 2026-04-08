/*!
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import { AbsoluteSourceSpan, ParseSourceSpan } from '@angular/compiler';
import ts from 'typescript';
import { ExpressionIdentifier } from '../comments';
/** Represents an expression generated within a type check block. */
export declare class TcbExpr {
    private source;
    /** Text for the content containing the expression's location information. */
    private spanComment;
    /** Text for the content containing the expression's identifier. */
    private identifierComment;
    /**
     * Text of the comment instructing the type checker to
     * ignore diagnostics coming from this expression.
     */
    private ignoreComment;
    constructor(source: string);
    /**
     * Converts the node's current state to a string.
     * @param ignoreComments Whether the comments associated with the expression should be skipped.
     */
    print(ignoreComments?: boolean): string;
    /**
     * Adds a synthetic comment to the expression that represents the parse span of the provided node.
     * This comment can later be retrieved as trivia of a node to recover original source locations.
     * @param span Span from the parser containing the location information.
     */
    addParseSpanInfo(span: AbsoluteSourceSpan | ParseSourceSpan): this;
    /** Marks the expression to be ignored for diagnostics. */
    markIgnoreDiagnostics(): this;
    /**
     * Wraps the expression in parenthesis such that inserted
     * span comments become attached to the proper node.
     */
    wrapForTypeChecker(): this;
    /**
     * Tags the expression with an identifier.
     * @param identifier Identifier to apply to the expression.
     */
    addExpressionIdentifier(identifier: ExpressionIdentifier, id?: number): this;
    /**
     * `toString` implementation meant to catch errors like accidentally
     * writing `foo ${expr} bar` instead of `foo ${expr.print()} bar`.
     */
    toString(): never;
    /** Format a comment string as a TypeScript comment. */
    private formatComment;
}
/**
 * Declares a variable with a specific type.
 * @param identifier Identifier used to refer to the variable.
 * @param type Type that the variable should be initialized to.
 */
export declare function declareVariable(identifier: TcbExpr, type: TcbExpr): TcbExpr;
/**
 * Formats an array of `TcbExpr` as a block of single statements.
 * @param expressions Expressions to format.
 * @param singleLine Whether to print them on a single line or across multiple. Defaults to multiple.
 */
export declare function getStatementsBlock(expressions: TcbExpr[], singleLine?: boolean): string;
/** Wraps a string value in quotes and escapes relevant characters. */
export declare function quoteAndEscape(value: string): string;
/**
 * Prints a TypeScript node as a string.
 *
 * @deprecated This is a temporary method until all code generation code has been migrated.
 */
export declare function tempPrint(node: ts.Node, sourceFile: ts.SourceFile): string;
