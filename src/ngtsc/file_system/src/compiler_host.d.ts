/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import ts from 'typescript';
import { FileSystem } from './types';
export declare class NgtscCompilerHost implements ts.CompilerHost {
    protected fs: FileSystem;
    protected options: ts.CompilerOptions;
    constructor(fs: FileSystem, options?: ts.CompilerOptions);
    getSourceFile(fileName: string, languageVersion: ts.ScriptTarget): ts.SourceFile | undefined;
    getDefaultLibFileName(options: ts.CompilerOptions): string;
    getDefaultLibLocation(): string;
    writeFile(fileName: string, data: string, writeByteOrderMark: boolean, onError: ((message: string) => void) | undefined, sourceFiles?: ReadonlyArray<ts.SourceFile>): void;
    getCurrentDirectory(): string;
    getCanonicalFileName(fileName: string): string;
    useCaseSensitiveFileNames(): boolean;
    getNewLine(): string;
    fileExists(fileName: string): boolean;
    readFile(fileName: string): string | undefined;
    realpath(path: string): string;
}
