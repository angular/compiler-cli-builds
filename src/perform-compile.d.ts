import * as ts from 'typescript';
import * as api from './transformers/api';
export declare type Diagnostics = Array<ts.Diagnostic | api.Diagnostic>;
export declare function formatDiagnostics(options: api.CompilerOptions, diags: Diagnostics): string;
export interface ParsedConfiguration {
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
export declare function performCompilation(rootNames: string[], options: api.CompilerOptions, host?: api.CompilerHost, oldProgram?: api.Program): {
    program?: api.Program;
    emitResult?: api.EmitResult;
    diagnostics: Diagnostics;
};
