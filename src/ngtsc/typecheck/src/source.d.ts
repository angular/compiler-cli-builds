/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import { AbsoluteSourceSpan, ParseSourceFile, ParseSourceSpan } from '@angular/compiler';
import ts from 'typescript';
import { TemplateId, TemplateSourceMapping } from '../api';
import { TemplateSourceResolver } from './tcb_util';
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
 * Implements `TemplateSourceResolver` to resolve the source of a template based on these IDs.
 */
export declare class TemplateSourceManager implements TemplateSourceResolver {
    /**
     * This map keeps track of all template sources that have been type-checked by the id that is
     * attached to a TCB's function declaration as leading trivia. This enables translation of
     * diagnostics produced for TCB code to their source location in the template.
     */
    private templateSources;
    getTemplateId(node: ts.ClassDeclaration): TemplateId;
    captureSource(node: ts.ClassDeclaration, mapping: TemplateSourceMapping, file: ParseSourceFile): TemplateId;
    getSourceMapping(id: TemplateId): TemplateSourceMapping;
    toParseSourceSpan(id: TemplateId, span: AbsoluteSourceSpan): ParseSourceSpan | null;
}
