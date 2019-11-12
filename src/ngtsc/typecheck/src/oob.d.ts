/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/// <amd-module name="@angular/compiler-cli/src/ngtsc/typecheck/src/oob" />
import { AbsoluteSourceSpan, BindingPipe, TmplAstReference } from '@angular/compiler';
import * as ts from 'typescript';
import { TcbSourceResolver } from './diagnostics';
/**
 * Collects `ts.Diagnostic`s on problems which occur in the template which aren't directly sourced
 * from Type Check Blocks.
 *
 * During the creation of a Type Check Block, the template is traversed and the
 * `OutOfBandDiagnosticRecorder` is called to record cases when a correct interpretation for the
 * template cannot be found. These operations create `ts.Diagnostic`s which are stored by the
 * recorder for later display.
 */
export interface OutOfBandDiagnosticRecorder {
    readonly diagnostics: ReadonlyArray<ts.Diagnostic>;
    /**
     * Reports a `#ref="target"` expression in the template for which a target directive could not be
     * found.
     *
     * @param templateId the template type-checking ID of the template which contains the broken
     * reference.
     * @param ref the `TmplAstReference` which could not be matched to a directive.
     */
    missingReferenceTarget(templateId: string, ref: TmplAstReference): void;
    /**
     * Reports usage of a `| pipe` expression in the template for which the named pipe could not be
     * found.
     *
     * @param templateId the template type-checking ID of the template which contains the unknown
     * pipe.
     * @param ast the `BindingPipe` invocation of the pipe which could not be found.
     * @param sourceSpan the `AbsoluteSourceSpan` of the pipe invocation (ideally, this should be the
     * source span of the pipe's name). This depends on the source span of the `BindingPipe` itself
     * plus span of the larger expression context.
     */
    missingPipe(templateId: string, ast: BindingPipe, sourceSpan: AbsoluteSourceSpan): void;
}
export declare class OutOfBandDiagnosticRecorderImpl implements OutOfBandDiagnosticRecorder {
    private resolver;
    private _diagnostics;
    constructor(resolver: TcbSourceResolver);
    readonly diagnostics: ReadonlyArray<ts.Diagnostic>;
    missingReferenceTarget(templateId: string, ref: TmplAstReference): void;
    missingPipe(templateId: string, ast: BindingPipe, absSpan: AbsoluteSourceSpan): void;
}
