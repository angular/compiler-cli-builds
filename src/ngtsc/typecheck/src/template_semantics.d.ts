/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/// <amd-module name="@angular/compiler-cli/src/ngtsc/typecheck/src/template_semantics" />
import { AST, BoundTarget, ParseSourceSpan, PropertyWrite, RecursiveAstVisitor } from '@angular/compiler';
import { OutOfBandDiagnosticRecorder } from './oob';
/**
 * Visits a template and records any semantic errors within its expressions.
 */
export declare class ExpressionSemanticVisitor extends RecursiveAstVisitor {
    private templateId;
    private boundTarget;
    private oob;
    private sourceSpan;
    constructor(templateId: string, boundTarget: BoundTarget<any>, oob: OutOfBandDiagnosticRecorder, sourceSpan: ParseSourceSpan);
    visitPropertyWrite(ast: PropertyWrite, context: any): void;
    static visit(ast: AST, sourceSpan: ParseSourceSpan, id: string, boundTarget: BoundTarget<any>, oob: OutOfBandDiagnosticRecorder): void;
}
