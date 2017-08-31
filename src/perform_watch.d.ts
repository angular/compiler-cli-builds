import { Diagnostics, ParsedConfiguration, PerformCompilationResult } from './perform_compile';
import * as api from './transformers/api';
export declare enum FileChangeEvent {
    Change = 0,
    CreateDelete = 1,
}
export interface PerformWatchHost {
    reportDiagnostics(diagnostics: Diagnostics): void;
    readConfiguration(): ParsedConfiguration;
    createCompilerHost(options: api.CompilerOptions): api.CompilerHost;
    createEmitCallback(options: api.CompilerOptions): api.TsEmitCallback | undefined;
    onFileChange(listener: (event: FileChangeEvent, fileName: string) => void): {
        close: () => void;
        ready: (cb: () => void) => void;
    };
    setTimeout(callback: () => void, ms: number): any;
    clearTimeout(timeoutId: any): void;
}
export declare function createPerformWatchHost(configFileName: string, reportDiagnostics: (diagnostics: Diagnostics) => void, createEmitCallback?: (options: api.CompilerOptions) => api.TsEmitCallback): PerformWatchHost;
/**
 * The logic in this function is adapted from `tsc.ts` from TypeScript.
 */
export declare function performWatchCompilation(host: PerformWatchHost): {
    close: () => void;
    ready: (cb: () => void) => void;
    firstCompileResult: PerformCompilationResult | undefined;
};
