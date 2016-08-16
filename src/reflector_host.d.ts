/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { AngularCompilerOptions, ModuleMetadata } from '@angular/tsc-wrapped';
import * as ts from 'typescript';
import { ImportGenerator } from './compiler_private';
import { StaticReflectorHost, StaticSymbol } from './static_reflector';
export declare const GENERATED_FILES: RegExp;
export interface ReflectorHostContext {
    fileExists(fileName: string): boolean;
    directoryExists(directoryName: string): boolean;
    readFile(fileName: string): string;
    assumeFileExists(fileName: string): void;
}
export declare class ReflectorHost implements StaticReflectorHost, ImportGenerator {
    private program;
    private compilerHost;
    private options;
    private metadataCollector;
    private context;
    private isGenDirChildOfRootDir;
    private basePath;
    private genDir;
    constructor(program: ts.Program, compilerHost: ts.CompilerHost, options: AngularCompilerOptions, context?: ReflectorHostContext);
    angularImportLocations(): {
        coreDecorators: string;
        diDecorators: string;
        diMetadata: string;
        diOpaqueToken: string;
        animationMetadata: string;
        provider: string;
    };
    private resolve(m, containingFile);
    private normalizeAssetUrl(url);
    private resolveAssetUrl(url, containingFile);
    /**
     * We want a moduleId that will appear in import statements in the generated code.
     * These need to be in a form that system.js can load, so absolute file paths don't work.
     *
     * The `containingFile` is always in the `genDir`, where as the `importedFile` can be in
     * `genDir`, `node_module` or `rootDir`/`rootDirs`.
     * The `importedFile` is either a generated file or an existing file.
     *
     *               | genDir   | node_module |  rootDir
     * --------------+----------+-------------+----------
     * generated     | relative |   relative  |   n/a
     * existing file |   n/a    |   absolute  |  relative(*)
     *
     * NOTE: (*) the relative path is computed depending on `isGenDirChildOfRootDir`.
     */
    getImportPath(containingFile: string, importedFile: string): string;
    private fixupGendirRelativePath(containingFile, importedFile);
    private dotRelative(from, to);
    findDeclaration(module: string, symbolName: string, containingFile: string, containingModule?: string): StaticSymbol;
    private typeCache;
    private resolverCache;
    /**
     * getStaticSymbol produces a Type whose metadata is known but whose implementation is not loaded.
     * All types passed to the StaticResolver should be pseudo-types returned by this method.
     *
     * @param declarationFile the absolute path of the file where the symbol is declared
     * @param name the name of the type.
     */
    getStaticSymbol(declarationFile: string, name: string): StaticSymbol;
    getMetadataFor(filePath: string): ModuleMetadata;
    readMetadata(filePath: string): any;
    private getResolverMetadata(filePath);
    private resolveExportedSymbol(filePath, symbolName);
}
export declare class NodeReflectorHostContext implements ReflectorHostContext {
    private assumedExists;
    fileExists(fileName: string): boolean;
    directoryExists(directoryName: string): boolean;
    readFile(fileName: string): string;
    assumeFileExists(fileName: string): void;
}
