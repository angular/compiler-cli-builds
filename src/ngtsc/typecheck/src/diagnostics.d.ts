/// <amd-module name="@angular/compiler-cli/src/ngtsc/typecheck/src/diagnostics" />
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { ParseSourceSpan, ParseSpan } from '@angular/compiler';
import * as ts from 'typescript';
import { TemplateSourceMapping } from './api';
export interface SourceLocation {
    id: string;
    start: number;
    end: number;
}
/**
 * Adapter interface which allows the template type-checking diagnostics code to interpret offsets
 * in a TCB and map them back to original locations in the template.
 */
export interface TcbSourceResolver {
    /**
     * For the given template id, retrieve the original source mapping which describes how the offsets
     * in the template should be interpreted.
     */
    getSourceMapping(id: string): TemplateSourceMapping;
    /**
     * Convert a location extracted from a TCB into a `ParseSourceSpan` if possible.
     */
    sourceLocationToSpan(location: SourceLocation): ParseSourceSpan | null;
}
/**
 * An `AbsoluteSpan` is the result of translating the `ParseSpan` of `AST` template expression nodes
 * to their absolute positions, as the `ParseSpan` is always relative to the start of the
 * expression, not the full template.
 */
export interface AbsoluteSpan {
    __brand__: 'AbsoluteSpan';
    start: number;
    end: number;
}
/**
 * Translates a `ParseSpan` into an `AbsoluteSpan` by incorporating the location information that
 * the `ParseSourceSpan` represents.
 */
export declare function toAbsoluteSpan(span: ParseSpan, sourceSpan: ParseSourceSpan): AbsoluteSpan;
/**
 * Wraps the node in parenthesis such that inserted span comments become attached to the proper
 * node. This is an alias for `ts.createParen` with the benefit that it signifies that the
 * inserted parenthesis are for diagnostic purposes, not for correctness of the rendered TCB code.
 *
 * Note that it is important that nodes and its attached comment are not wrapped into parenthesis
 * by default, as it prevents correct translation of e.g. diagnostics produced for incorrect method
 * arguments. Such diagnostics would then be produced for the parenthesised node whereas the
 * positional comment would be located within that node, resulting in a mismatch.
 */
export declare function wrapForDiagnostics(expr: ts.Expression): ts.Expression;
/**
 * Adds a synthetic comment to the expression that represents the parse span of the provided node.
 * This comment can later be retrieved as trivia of a node to recover original source locations.
 */
export declare function addParseSpanInfo(node: ts.Node, span: AbsoluteSpan | ParseSourceSpan): void;
/**
 * Adds a synthetic comment to the function declaration that contains the source location
 * of the class declaration.
 */
export declare function addSourceId(tcb: ts.FunctionDeclaration, id: string): void;
/**
 * Determines if the diagnostic should be reported. Some diagnostics are produced because of the
 * way TCBs are generated; those diagnostics should not be reported as type check errors of the
 * template.
 */
export declare function shouldReportDiagnostic(diagnostic: ts.Diagnostic): boolean;
/**
 * Attempts to translate a TypeScript diagnostic produced during template type-checking to their
 * location of origin, based on the comments that are emitted in the TCB code.
 *
 * If the diagnostic could not be translated, `null` is returned to indicate that the diagnostic
 * should not be reported at all. This prevents diagnostics from non-TCB code in a user's source
 * file from being reported as type-check errors.
 */
export declare function translateDiagnostic(diagnostic: ts.Diagnostic, resolver: TcbSourceResolver): ts.Diagnostic | null;
/**
 * Constructs a `ts.Diagnostic` for a given `ParseSourceSpan` within a template.
 */
export declare function makeTemplateDiagnostic(mapping: TemplateSourceMapping, span: ParseSourceSpan, category: ts.DiagnosticCategory, code: number, messageText: string | ts.DiagnosticMessageChain): ts.Diagnostic;
