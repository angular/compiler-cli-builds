/// <amd-module name="@angular/compiler-cli/ngcc/src/packages/ngcc_compiler_host" />
import * as ts from 'typescript';
import { FileSystem } from '../file_system/file_system';
export declare class NgccCompilerHost implements ts.CompilerHost {
    private fs;
    private options;
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
