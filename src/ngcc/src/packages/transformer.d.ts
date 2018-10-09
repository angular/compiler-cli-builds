/// <amd-module name="@angular/compiler-cli/src/ngcc/src/packages/transformer" />
import * as ts from 'typescript';
import { AnalyzedFile } from '../analyzer';
import { DtsMapper } from '../host/dts_mapper';
import { NgccReflectionHost } from '../host/ngcc_host';
import { FileParser } from '../parsing/file_parser';
import { FileInfo, Renderer } from '../rendering/renderer';
import { EntryPoint, EntryPointFormat } from './entry_point';
/**
 * A Package is stored in a directory on disk and that directory can contain one or more package
 * formats - e.g. fesm2015, UMD, etc. Additionally, each package provides typings (`.d.ts` files).
 *
 * Each of these formats exposes one or more entry points, which are source files that need to be
 * parsed to identify the decorated exported classes that need to be analyzed and compiled by one or
 * more `DecoratorHandler` objects.
 *
 * Each entry point to a package is identified by a `SourceFile` that can be parsed and analyzed to
 * identify classes that need to be transformed; and then finally rendered and written to disk.
 * The actual file which needs to be transformed depends upon the package format.
 *
 * Along with the source files, the corresponding source maps (either inline or external) and
 * `.d.ts` files are transformed accordingly.
 *
 * - Flat file packages have all the classes in a single file.
 * - Other packages may re-export classes from other non-entry point files.
 * - Some formats may contain multiple "modules" in a single file.
 */
export declare class Transformer {
    private sourcePath;
    private targetPath;
    constructor(sourcePath: string, targetPath: string);
    transform(entryPoint: EntryPoint, format: EntryPointFormat): void;
    getHost(isCore: boolean, format: string, program: ts.Program, dtsMapper: DtsMapper): NgccReflectionHost;
    getFileParser(format: string, program: ts.Program, host: NgccReflectionHost): FileParser;
    getRenderer(format: string, program: ts.Program, host: NgccReflectionHost, isCore: boolean, rewriteCoreImportsTo: ts.SourceFile | null): Renderer;
    transformDtsFiles(analyzedFiles: AnalyzedFile[], sourceNodeModules: string, targetNodeModules: string, dtsMapper: DtsMapper): FileInfo[];
    transformSourceFiles(analyzedFiles: AnalyzedFile[], sourceNodeModules: string, targetNodeModules: string, renderer: Renderer): FileInfo[];
    writeFile(file: FileInfo): void;
    findR3SymbolsPath(directory: string): string | null;
}
