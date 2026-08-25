/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import { ParseSourceSpan, TypeCheckId } from '@angular/compiler';
import ts from 'typescript';
import { TemplateDiagnostic, SourceMapping } from '../../api';
interface DeprecatedDiagnosticInfo {
    reportsDeprecated: {} | undefined;
    relatedMessages: ts.DiagnosticRelatedInformation[] | undefined;
}
/**
 * Constructs a `ts.Diagnostic` for a given `ParseSourceSpan` within a template.
 *
 * @param id The unique type-check ID for the component.
 * @param mapping The source mapping for the template (direct, indirect, or external).
 * @param span The source span within the template where the diagnostic occurred.
 * @param category The diagnostic category (Error, Warning, Suggestion, Message).
 * @param code The numeric Angular error code.
 * @param messageText The primary diagnostic message.
 * @param relatedMessages Optional list of secondary related messages:
 *   - Omit `sourceFile` (leave `undefined`) when `start` and `end` offsets correspond to
 *     positions within the template itself. The diagnostic will automatically associate them
 *     with the template source file (such as the parsed external HTML file or inline template node).
 *   - Specify `sourceFile` only when the message points to an external file (e.g., a component,
 *     directive, or pipe TypeScript declaration file) where `start` and `end` are offsets within
 *     that specific source file.
 * @param deprecatedDiagInfo Optional information about deprecation and related messages.
 */
export declare function makeTemplateDiagnostic(id: TypeCheckId, mapping: SourceMapping, span: ParseSourceSpan, category: ts.DiagnosticCategory, code: number, messageText: string | ts.DiagnosticMessageChain, relatedMessages?: {
    text: string;
    start: number;
    end: number;
    sourceFile?: ts.SourceFile;
}[], deprecatedDiagInfo?: DeprecatedDiagnosticInfo): TemplateDiagnostic;
export declare function setParseTemplateAsSourceFileForTest(fn: typeof parseTemplateAsSourceFile): void;
export declare function resetParseTemplateAsSourceFileForTest(): void;
declare function parseTemplateAsSourceFile(fileName: string, template: string): ts.SourceFile;
export declare function isTemplateDiagnostic(diagnostic: ts.Diagnostic): diagnostic is TemplateDiagnostic;
export {};
