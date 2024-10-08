/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import ts from 'typescript';
import { AbsoluteFsPath } from '../../file_system';
import { RequiredDelegations } from '../../util/src/typescript';
import { FileUpdate, ProgramDriver, UpdateMode } from './api';
/**
 * Delegates all methods of `ts.CompilerHost` to a delegate, with the exception of
 * `getSourceFile`, `fileExists` and `writeFile` which are implemented in `TypeCheckProgramHost`.
 *
 * If a new method is added to `ts.CompilerHost` which is not delegated, a type error will be
 * generated for this class.
 */
export declare class DelegatingCompilerHost implements Omit<RequiredDelegations<ts.CompilerHost>, 'getSourceFile' | 'fileExists' | 'writeFile'> {
    protected delegate: ts.CompilerHost;
    createHash: ((data: string) => string) | undefined;
    directoryExists: ((directoryName: string) => boolean) | undefined;
    getCancellationToken: (() => ts.CancellationToken) | undefined;
    getCanonicalFileName: (fileName: string) => string;
    getCurrentDirectory: () => string;
    getDefaultLibFileName: (options: ts.CompilerOptions) => string;
    getDefaultLibLocation: (() => string) | undefined;
    getDirectories: ((path: string) => string[]) | undefined;
    getEnvironmentVariable: ((name: string) => string | undefined) | undefined;
    getNewLine: () => string;
    getParsedCommandLine: ((fileName: string) => ts.ParsedCommandLine | undefined) | undefined;
    getSourceFileByPath: ((fileName: string, path: ts.Path, languageVersionOrOptions: ts.ScriptTarget | ts.CreateSourceFileOptions, onError?: (message: string) => void, shouldCreateNewSourceFile?: boolean) => ts.SourceFile | undefined) | undefined;
    readDirectory: ((rootDir: string, extensions: readonly string[], excludes: readonly string[] | undefined, includes: readonly string[], depth?: number) => string[]) | undefined;
    readFile: (fileName: string) => string | undefined;
    realpath: ((path: string) => string) | undefined;
    resolveModuleNames: ((moduleNames: string[], containingFile: string, reusedNames: string[] | undefined, redirectedReference: ts.ResolvedProjectReference | undefined, options: ts.CompilerOptions, containingSourceFile?: ts.SourceFile) => (ts.ResolvedModule | undefined)[]) | undefined;
    resolveTypeReferenceDirectives: ((typeReferenceDirectiveNames: string[] | readonly ts.FileReference[], containingFile: string, redirectedReference: ts.ResolvedProjectReference | undefined, options: ts.CompilerOptions, containingFileMode?: ts.ResolutionMode) => (ts.ResolvedTypeReferenceDirective | undefined)[]) | undefined;
    trace: ((s: string) => void) | undefined;
    useCaseSensitiveFileNames: () => boolean;
    getModuleResolutionCache: (() => ts.ModuleResolutionCache | undefined) | undefined;
    hasInvalidatedResolutions: ((filePath: ts.Path) => boolean) | undefined;
    resolveModuleNameLiterals: ((moduleLiterals: readonly ts.StringLiteralLike[], containingFile: string, redirectedReference: ts.ResolvedProjectReference | undefined, options: ts.CompilerOptions, containingSourceFile: ts.SourceFile, reusedNames: readonly ts.StringLiteralLike[] | undefined) => readonly ts.ResolvedModuleWithFailedLookupLocations[]) | undefined;
    resolveTypeReferenceDirectiveReferences: (<T extends ts.FileReference | string>(typeDirectiveReferences: readonly T[], containingFile: string, redirectedReference: ts.ResolvedProjectReference | undefined, options: ts.CompilerOptions, containingSourceFile: ts.SourceFile | undefined, reusedNames: readonly T[] | undefined) => readonly ts.ResolvedTypeReferenceDirectiveWithFailedLookupLocations[]) | undefined;
    get jsDocParsingMode(): ts.JSDocParsingMode | undefined;
    set jsDocParsingMode(mode: ts.JSDocParsingMode | undefined);
    constructor(delegate: ts.CompilerHost);
    private delegateMethod;
}
/**
 * Updates a `ts.Program` instance with a new one that incorporates specific changes, using the
 * TypeScript compiler APIs for incremental program creation.
 */
export declare class TsCreateProgramDriver implements ProgramDriver {
    private originalProgram;
    private originalHost;
    private options;
    private shimExtensionPrefixes;
    /**
     * A map of source file paths to replacement `ts.SourceFile`s for those paths.
     *
     * Effectively, this tracks the delta between the user's program (represented by the
     * `originalHost`) and the template type-checking program being managed.
     */
    private sfMap;
    private program;
    constructor(originalProgram: ts.Program, originalHost: ts.CompilerHost, options: ts.CompilerOptions, shimExtensionPrefixes: string[]);
    readonly supportsInlineOperations = true;
    getProgram(): ts.Program;
    updateFiles(contents: Map<AbsoluteFsPath, FileUpdate>, updateMode: UpdateMode): void;
}
