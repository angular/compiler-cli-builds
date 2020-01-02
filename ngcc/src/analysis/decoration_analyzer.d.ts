/// <amd-module name="@angular/compiler-cli/ngcc/src/analysis/decoration_analyzer" />
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { ConstantPool } from '@angular/compiler';
import * as ts from 'typescript';
import { ReferencesRegistry, ResourceLoader } from '../../../src/ngtsc/annotations';
import { CycleAnalyzer, ImportGraph } from '../../../src/ngtsc/cycles';
import { FileSystem } from '../../../src/ngtsc/file_system';
import { ModuleResolver, PrivateExportAliasingHost, ReferenceEmitter } from '../../../src/ngtsc/imports';
import { CompoundMetadataReader, CompoundMetadataRegistry, DtsMetadataReader, InjectableClassRegistry, LocalMetadataRegistry } from '../../../src/ngtsc/metadata';
import { PartialEvaluator } from '../../../src/ngtsc/partial_evaluator';
import { LocalModuleScopeRegistry, MetadataDtsModuleScopeResolver } from '../../../src/ngtsc/scope';
import { CompileResult, DecoratorHandler } from '../../../src/ngtsc/transform';
import { NgccClassSymbol, NgccReflectionHost } from '../host/ngcc_host';
import { Migration } from '../migrations/migration';
import { EntryPointBundle } from '../packages/entry_point_bundle';
import { AnalyzedClass, AnalyzedFile, CompiledFile, DecorationAnalyses } from './types';
/**
 * Simple class that resolves and loads files directly from the filesystem.
 */
declare class NgccResourceLoader implements ResourceLoader {
    private fs;
    constructor(fs: FileSystem);
    canPreload: boolean;
    preload(): undefined | Promise<void>;
    load(url: string): string;
    resolve(url: string, containingFile: string): string;
}
/**
 * This Analyzer will analyze the files that have decorated classes that need to be transformed.
 */
export declare class DecorationAnalyzer {
    private fs;
    private bundle;
    private reflectionHost;
    private referencesRegistry;
    private diagnosticHandler;
    private program;
    private options;
    private host;
    private typeChecker;
    private rootDirs;
    private packagePath;
    private isCore;
    /**
     * Map of NgModule declarations to the re-exports for that NgModule.
     */
    private reexportMap;
    moduleResolver: ModuleResolver;
    resourceManager: NgccResourceLoader;
    metaRegistry: LocalMetadataRegistry;
    dtsMetaReader: DtsMetadataReader;
    fullMetaReader: CompoundMetadataReader;
    refEmitter: ReferenceEmitter;
    aliasingHost: PrivateExportAliasingHost | null;
    dtsModuleScopeResolver: MetadataDtsModuleScopeResolver;
    scopeRegistry: LocalModuleScopeRegistry;
    fullRegistry: CompoundMetadataRegistry;
    evaluator: PartialEvaluator;
    importGraph: ImportGraph;
    cycleAnalyzer: CycleAnalyzer;
    injectableRegistry: InjectableClassRegistry;
    handlers: DecoratorHandler<unknown, unknown, unknown>[];
    migrations: Migration[];
    constructor(fs: FileSystem, bundle: EntryPointBundle, reflectionHost: NgccReflectionHost, referencesRegistry: ReferencesRegistry, diagnosticHandler?: (error: ts.Diagnostic) => void);
    /**
     * Analyze a program to find all the decorated files should be transformed.
     *
     * @returns a map of the source files to the analysis for those files.
     */
    analyzeProgram(): DecorationAnalyses;
    protected analyzeFile(sourceFile: ts.SourceFile): AnalyzedFile | undefined;
    protected analyzeClass(symbol: NgccClassSymbol): AnalyzedClass | null;
    protected applyMigrations(analyzedFiles: AnalyzedFile[]): void;
    protected compileFile(analyzedFile: AnalyzedFile): CompiledFile;
    protected compileClass(clazz: AnalyzedClass, constantPool: ConstantPool): CompileResult[];
    protected resolveFile(analyzedFile: AnalyzedFile): void;
    private getReexportsForClass;
    private addReexports;
}
export {};
