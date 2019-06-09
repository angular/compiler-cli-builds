/// <amd-module name="@angular/compiler-cli/ngcc/src/packages/ngcc_compiler_host" />
import * as ts from 'typescript';
import { FileSystem } from '../file_system/file_system';
export declare class NgccCompilerHost implements ts.CompilerHost {
    protected fs: FileSystem;
    protected options: ts.CompilerOptions;
    private _caseSensitive;
    constructor(fs: FileSystem, options: ts.CompilerOptions);
    getSourceFile(fileName: string, languageVersion: ts.ScriptTarget): ts.SourceFile | undefined;
    getDefaultLibFileName(options: ts.CompilerOptions): string;
    getDefaultLibLocation(): string;
    writeFile(fileName: string, data: string): void;
    getCurrentDirectory(): string;
    getCanonicalFileName(fileName: string): string;
    useCaseSensitiveFileNames(): boolean;
    getNewLine(): string;
    fileExists(fileName: string): boolean;
    readFile(fileName: string): string | undefined;
}
/**
 * Represents a compiler host that resolves a module import as a JavaScript source file if
 * available, instead of the .d.ts typings file that would have been resolved by TypeScript. This
 * is necessary for packages that have their typings in the same directory as the sources, which
 * would otherwise let TypeScript prefer the .d.ts file instead of the JavaScript source file.
 */
export declare class NgccSourcesCompilerHost extends NgccCompilerHost {
    protected entryPointPath: string;
    private cache;
    constructor(fs: FileSystem, options: ts.CompilerOptions, entryPointPath: string);
    resolveModuleNames(moduleNames: string[], containingFile: string, reusedNames?: string[], redirectedReference?: ts.ResolvedProjectReference): Array<ts.ResolvedModule | undefined>;
}
