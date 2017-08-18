/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { ParseSourceSpan } from '@angular/compiler';
import * as ts from 'typescript';
export interface Diagnostic {
    message: string;
    span?: ParseSourceSpan;
    category: ts.DiagnosticCategory;
}
export interface CompilerOptions extends ts.CompilerOptions {
    genDir?: string;
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
    expectedOut?: string[];
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
    /**
     * Converts a module name that is used in an `import` to a file path.
     * I.e. `path/to/containingFile.ts` containing `import {...} from 'module-name'`.
     */
    moduleNameToFileName(moduleName: string, containingFile?: string): string | null;
    /**
     * Converts a file path to a module name that can be used as an `import ...`
     * I.e. `path/to/importedFile.ts` should be imported by `path/to/containingFile.ts`.
     */
    fileNameToModuleName(importedFilePath: string, containingFilePath: string): string | null;
    /**
     * Converts a file path for a resource that is used in a source file or another resource
     * into a filepath.
     */
    resourceNameToFileName(resourceName: string, containingFilePath: string): string | null;
    /**
     * Converts a file name into a representation that should be stored in a summary file.
     * This has to include changing the suffix as well.
     * E.g.
     * `some_file.ts` -> `some_file.d.ts`
     *
     * @param referringSrcFileName the soure file that refers to fileName
     */
    toSummaryFileName(fileName: string, referringSrcFileName: string): string;
    /**
     * Converts a fileName that was processed by `toSummaryFileName` back into a real fileName
     * given the fileName of the library that is referrig to it.
     */
    fromSummaryFileName(fileName: string, referringLibFileName: string): string;
    /**
     * Load a referenced resource either statically or asynchronously. If the host returns a
     * `Promise<string>` it is assumed the user of the corresponding `Program` will call
     * `loadNgStructureAsync()`. Returing  `Promise<string>` outside `loadNgStructureAsync()` will
     * cause a diagnostics diagnostic error or an exception to be thrown.
     */
    readResource?(fileName: string): Promise<string> | string;
}
export declare enum EmitFlags {
    DTS = 1,
    JS = 2,
    Metadata = 4,
    I18nBundle = 8,
    Summary = 16,
    Default = 3,
    All = 31,
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
    /**
     * Retrieve the TypeScript program used to produce semantic diagnostics and emit the sources.
     *
     * Angular structural information is required to produce the program.
     */
    getTsProgram(): ts.Program;
    /**
     * Retrieve options diagnostics for the TypeScript options used to create the program. This is
     * faster than calling `getTsProgram().getOptionsDiagnostics()` since it does not need to
     * collect Angular structural information to produce the errors.
     */
    getTsOptionDiagnostics(cancellationToken?: ts.CancellationToken): ts.Diagnostic[];
    /**
     * Retrieve options diagnostics for the Angular options used to create the program.
     */
    getNgOptionDiagnostics(cancellationToken?: ts.CancellationToken): Diagnostic[];
    /**
     * Retrieve the syntax diagnostics from TypeScript. This is faster than calling
     * `getTsProgram().getSyntacticDiagnostics()` since it does not need to collect Angular structural
     * information to produce the errors.
     */
    getTsSyntacticDiagnostics(sourceFile?: ts.SourceFile, cancellationToken?: ts.CancellationToken): ts.Diagnostic[];
    /**
     * Retrieve the diagnostics for the structure of an Angular application is correctly formed.
     * This includes validating Angular annotations and the syntax of referenced and imbedded HTML
     * and CSS.
     *
     * Note it is important to displaying TypeScript semantic diagnostics along with Angular
     * structural diagnostics as an error in the program strucutre might cause errors detected in
     * semantic analysis and a semantic error might cause errors in specifying the program structure.
     *
     * Angular structural information is required to produce these diagnostics.
     */
    getNgStructuralDiagnostics(cancellationToken?: ts.CancellationToken): Diagnostic[];
    /**
     * Retrieve the semantic diagnostics from TypeScript. This is equivilent to calling
     * `getTsProgram().getSemanticDiagnostics()` directly and is included for completeness.
     */
    getTsSemanticDiagnostics(sourceFile?: ts.SourceFile, cancellationToken?: ts.CancellationToken): ts.Diagnostic[];
    /**
     * Retrieve the Angular semantic diagnostics.
     *
     * Angular structural information is required to produce these diagnostics.
     */
    getNgSemanticDiagnostics(fileName?: string, cancellationToken?: ts.CancellationToken): Diagnostic[];
    /**
     * Load Angular structural information asynchronously. If this method is not called then the
     * Angular structural information, including referenced HTML and CSS files, are loaded
     * synchronously. If the supplied Angular compiler host returns a promise from `loadResource()`
     * will produce a diagnostic error message or, `getTsProgram()` or `emit` to throw.
     */
    loadNgStructureAsync(): Promise<void>;
    /**
     * Retrieve the lazy route references in the program.
     *
     * Angular structural information is required to produce these routes.
     */
    getLazyRoutes(cancellationToken?: ts.CancellationToken): {
        [route: string]: string;
    };
    /**
     * Emit the files requested by emitFlags implied by the program.
     *
     * Angular structural information is required to emit files.
     */
    emit({emitFlags, cancellationToken, customTransformers, emitCallback}: {
        emitFlags?: EmitFlags;
        cancellationToken?: ts.CancellationToken;
        customTransformers?: CustomTransformers;
        emitCallback?: TsEmitCallback;
    }): ts.EmitResult;
}
