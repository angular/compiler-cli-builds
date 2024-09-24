/*!
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import ts from 'typescript';
import { ImportedSymbolsTracker } from '../../../imports';
import { TemplateTypeChecker, TypeCheckingConfig } from '../../../typecheck/api';
import { SourceFileValidatorRule } from './api';
/**
 * Rule that flags unused symbols inside of the `imports` array of a component.
 */
export declare class UnusedStandaloneImportsRule implements SourceFileValidatorRule {
    private templateTypeChecker;
    private typeCheckingConfig;
    private importedSymbolsTracker;
    constructor(templateTypeChecker: TemplateTypeChecker, typeCheckingConfig: TypeCheckingConfig, importedSymbolsTracker: ImportedSymbolsTracker);
    shouldCheck(sourceFile: ts.SourceFile): boolean;
    checkNode(node: ts.Node): ts.Diagnostic | null;
    private getUnusedSymbols;
}
