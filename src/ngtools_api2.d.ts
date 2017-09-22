/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/**
 * This is a private API for @ngtools/webpack. This API should be stable for NG 5.
 *
 * It contains copies of the interfaces needed and wrapper functions to ensure that
 * they are not broken accidentally.
 *
 * Once the ngc api is public and stable, this can be removed.
 */
import { ParseSourceSpan } from '@angular/compiler';
import * as ts from 'typescript';
export interface Diagnostic {
    messageText: string;
    span?: ParseSourceSpan;
    category: ts.DiagnosticCategory;
    code: number;
    source: 'angular';
}
export interface CompilerOptions extends ts.CompilerOptions {
    basePath?: string;
    skipMetadataEmit?: boolean;
    strictMetadataEmit?: boolean;
    skipTemplateCodegen?: boolean;
    flatModuleOutFile?: string;
    flatModuleId?: string;
    generateCodeForLibraries?: boolean;
    annotateForClosureCompiler?: boolean;
    annotationsAs?: 'decorators' | 'static fields';
    trace?: boolean;
    enableLegacyTemplate?: boolean;
    disableExpressionLowering?: boolean;
    i18nOutLocale?: string;
    i18nOutFormat?: string;
    i18nOutFile?: string;
    i18nInFormat?: string;
    i18nInLocale?: string;
    i18nInFile?: string;
    i18nInMissingTranslations?: 'error' | 'warning' | 'ignore';
    preserveWhitespaces?: boolean;
}
export interface CompilerHost extends ts.CompilerHost {
    moduleNameToFileName?(moduleName: string, containingFile?: string): string | null;
    fileNameToModuleName?(importedFilePath: string, containingFilePath: string): string;
    resourceNameToFileName?(resourceName: string, containingFilePath: string): string | null;
    toSummaryFileName?(fileName: string, referringSrcFileName: string): string;
    fromSummaryFileName?(fileName: string, referringLibFileName: string): string;
    readResource?(fileName: string): Promise<string> | string;
}
export declare enum EmitFlags {
    DTS = 1,
    JS = 2,
    Codegen = 16,
    Default = 19,
}
export interface CustomTransformers {
    beforeTs?: ts.TransformerFactory<ts.SourceFile>[];
    afterTs?: ts.TransformerFactory<ts.SourceFile>[];
}
export interface TsEmitArguments {
    program: ts.Program;
    host: CompilerHost;
    options: CompilerOptions;
    targetSourceFile?: ts.SourceFile;
    writeFile?: ts.WriteFileCallback;
    cancellationToken?: ts.CancellationToken;
    emitOnlyDtsFiles?: boolean;
    customTransformers?: ts.CustomTransformers;
}
export interface TsEmitCallback {
    (args: TsEmitArguments): ts.EmitResult;
}
export interface Program {
    getTsProgram(): ts.Program;
    getTsOptionDiagnostics(cancellationToken?: ts.CancellationToken): ts.Diagnostic[];
    getNgOptionDiagnostics(cancellationToken?: ts.CancellationToken): Diagnostic[];
    getTsSyntacticDiagnostics(sourceFile?: ts.SourceFile, cancellationToken?: ts.CancellationToken): ts.Diagnostic[];
    getNgStructuralDiagnostics(cancellationToken?: ts.CancellationToken): Diagnostic[];
    getTsSemanticDiagnostics(sourceFile?: ts.SourceFile, cancellationToken?: ts.CancellationToken): ts.Diagnostic[];
    getNgSemanticDiagnostics(fileName?: string, cancellationToken?: ts.CancellationToken): Diagnostic[];
    loadNgStructureAsync(): Promise<void>;
    emit({emitFlags, cancellationToken, customTransformers, emitCallback}: {
        emitFlags?: EmitFlags;
        cancellationToken?: ts.CancellationToken;
        customTransformers?: CustomTransformers;
        emitCallback?: TsEmitCallback;
    }): ts.EmitResult;
    getLibrarySummaries(): {
        fileName: string;
        content: string;
    }[];
}
export declare function createProgram({rootNames, options, host, oldProgram}: {
    rootNames: string[];
    options: CompilerOptions;
    host: CompilerHost;
    oldProgram?: Program;
}): Program;
export declare function createCompilerHost({options, tsHost}: {
    options: CompilerOptions;
    tsHost?: ts.CompilerHost;
}): CompilerHost;
export declare type Diagnostics = Array<ts.Diagnostic | Diagnostic>;
export declare function formatDiagnostics(options: CompilerOptions, diags: Diagnostics): string;
