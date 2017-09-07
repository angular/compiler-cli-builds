import 'reflect-metadata';
import { PerformCompilationResult } from './perform_compile';
export declare function main(args: string[], consoleError?: (s: string) => void): Promise<number>;
export declare function mainSync(args: string[], consoleError?: (s: string) => void): number;
export declare function watchMode(args: any, consoleError: (s: string) => void): {
    close: () => void;
    ready: (cb: () => void) => void;
    firstCompileResult: PerformCompilationResult | undefined;
};
