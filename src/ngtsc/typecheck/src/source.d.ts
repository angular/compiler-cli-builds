/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/// <amd-module name="@angular/compiler-cli/src/ngtsc/typecheck/src/source" />
import { ParseSourceFile, ParseSourceSpan } from '@angular/compiler';
import { TemplateSourceMapping } from './api';
import { SourceLocation, TcbSourceResolver } from './diagnostics';
/**
 * Represents the source of a template that was processed during type-checking. This information is
 * used when translating parse offsets in diagnostics back to their original line/column location.
 */
export declare class TemplateSource {
    readonly mapping: TemplateSourceMapping;
    private file;
    private lineStarts;
    constructor(mapping: TemplateSourceMapping, file: ParseSourceFile);
    toParseSourceSpan(start: number, end: number): ParseSourceSpan;
    private toParseLocation;
    private acquireLineStarts;
}
/**
 * Assigns IDs to templates and keeps track of their origins.
 *
 * Implements `TcbSourceResolver` to resolve the source of a template based on these IDs.
 */
export declare class TcbSourceManager implements TcbSourceResolver {
    private nextTcbId;
    /**
     * This map keeps track of all template sources that have been type-checked by the id that is
     * attached to a TCB's function declaration as leading trivia. This enables translation of
     * diagnostics produced for TCB code to their source location in the template.
     */
    private templateSources;
    captureSource(mapping: TemplateSourceMapping, file: ParseSourceFile): string;
    getSourceMapping(id: string): TemplateSourceMapping;
    sourceLocationToSpan(location: SourceLocation): ParseSourceSpan | null;
}
