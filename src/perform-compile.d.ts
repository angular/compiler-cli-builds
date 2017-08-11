import * as ts from 'typescript';
import * as api from './transformers/api';
export declare type Diagnostics = ts.Diagnostic[] | api.Diagnostic[];
/**
 * Throw a syntax error exception with a message formatted for output
 * if the args parameter contains diagnostics errors.
 *
 * @param cwd   The directory to report error as relative to.
 * @param args  A list of potentially empty diagnostic errors.
 */
export declare function throwOnDiagnostics(cwd: string, ...args: Diagnostics[]): void;
export declare function readConfiguration(project: string, basePath: string, checkFunc?: (cwd: string, ...args: any[]) => void, existingOptions?: ts.CompilerOptions): {
    parsed: ts.ParsedCommandLine;
    ngOptions: any;
};
/**
 * Returns an object with two properties:
 * - `errorCode` is 0 when the compilation was successful,
 * - `result` is an `EmitResult` when the errorCode is 0, `undefined` otherwise.
 */
export declare function performCompilation(basePath: string, files: string[], options: ts.CompilerOptions, ngOptions: api.CompilerOptions, consoleError?: (s: string) => void, checkFunc?: (cwd: string, ...args: any[]) => void, tsCompilerHost?: ts.CompilerHost): {
    errorCode: number;
    result?: api.EmitResult;
};
