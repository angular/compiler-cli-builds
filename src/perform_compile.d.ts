import * as ts from 'typescript';
import * as api from './transformers/api';
export declare type Diagnostics = Array<ts.Diagnostic | api.Diagnostic>;
export declare function formatDiagnostics(options: api.CompilerOptions, diags: Diagnostics): string;
export interface ParsedConfiguration {
    project: string;
    options: api.CompilerOptions;
    rootNames: string[];
    errors: Diagnostics;
}
export declare function calcProjectFileAndBasePath(project: string): {
    projectFile: string;
    basePath: string;
};
export declare function createNgCompilerOptions(basePath: string, config: any, tsOptions: ts.CompilerOptions): api.CompilerOptions;
export declare function readConfiguration(project: string, existingOptions?: ts.CompilerOptions): ParsedConfiguration;
export interface PerformCompilationResult {
    diagnostics: Diagnostics;
    program?: api.Program;
    emitResult?: ts.EmitResult;
}
export declare function exitCodeFromResult(result: PerformCompilationResult | undefined): number;
export declare function performCompilation({rootNames, options, host, oldProgram, emitCallback, customTransformers}: {
    rootNames: string[];
    options: api.CompilerOptions;
    host?: api.CompilerHost;
    oldProgram?: api.Program;
    emitCallback?: api.TsEmitCallback;
    customTransformers?: api.CustomTransformers;
}): PerformCompilationResult;
