/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/// <amd-module name="@angular/compiler-cli/src/ngtsc/program" />
import { GeneratedFile } from '@angular/compiler';
import * as ts from 'typescript';
import * as api from '../transformers/api';
import { ReferencesRegistry } from './annotations';
import { ReferenceGraph } from './entry_point';
import { Reference } from './imports';
import { IndexedComponent } from './indexer';
export declare class NgtscProgram implements api.Program {
    private options;
    private host;
    private tsProgram;
    private reuseTsProgram;
    private resourceManager;
    private compilation;
    private _coreImportsFrom;
    private _importRewriter;
    private _reflector;
    private _isCore;
    private rootDirs;
    private closureCompilerEnabled;
    private entryPoint;
    private exportReferenceGraph;
    private flatIndexGenerator;
    private routeAnalyzer;
    private scopeRegistry;
    private constructionDiagnostics;
    private moduleResolver;
    private cycleAnalyzer;
    private metaReader;
    private aliasingHost;
    private refEmitter;
    private fileToModuleHost;
    private defaultImportTracker;
    private perfRecorder;
    private perfTracker;
    private incrementalDriver;
    private typeCheckFilePath;
    private factoryTracker;
    private modifiedResourceFiles;
    private dtsTransforms;
    private mwpScanner;
    constructor(rootNames: ReadonlyArray<string>, options: api.CompilerOptions, host: api.CompilerHost, oldProgram?: NgtscProgram);
    getTsProgram(): ts.Program;
    getTsOptionDiagnostics(cancellationToken?: ts.CancellationToken | undefined): ReadonlyArray<ts.Diagnostic>;
    getNgOptionDiagnostics(cancellationToken?: ts.CancellationToken | undefined): ReadonlyArray<ts.Diagnostic>;
    getTsSyntacticDiagnostics(sourceFile?: ts.SourceFile | undefined, cancellationToken?: ts.CancellationToken | undefined): ReadonlyArray<ts.Diagnostic>;
    getNgStructuralDiagnostics(cancellationToken?: ts.CancellationToken | undefined): ReadonlyArray<api.Diagnostic>;
    getTsSemanticDiagnostics(sourceFile?: ts.SourceFile | undefined, cancellationToken?: ts.CancellationToken | undefined): ReadonlyArray<ts.Diagnostic>;
    getNgSemanticDiagnostics(fileName?: string | undefined, cancellationToken?: ts.CancellationToken | undefined): ReadonlyArray<ts.Diagnostic>;
    loadNgStructureAsync(): Promise<void>;
    listLazyRoutes(entryRoute?: string | undefined): api.LazyRoute[];
    getLibrarySummaries(): Map<string, api.LibrarySummary>;
    getEmittedGeneratedFiles(): Map<string, GeneratedFile>;
    getEmittedSourceFiles(): Map<string, ts.SourceFile>;
    private scanForMwp;
    private ensureAnalyzed;
    private resolveCompilation;
    emit(opts?: {
        emitFlags?: api.EmitFlags;
        cancellationToken?: ts.CancellationToken;
        customTransformers?: api.CustomTransformers;
        emitCallback?: api.TsEmitCallback;
        mergeEmitResultsCallback?: api.TsMergeEmitResultsCallback;
    }): ts.EmitResult;
    private getTemplateDiagnostics;
    getIndexedComponents(): Map<ts.Declaration, IndexedComponent>;
    private makeCompilation;
    /**
     * Reifies the inter-dependencies of NgModules and the components within their compilation scopes
     * into the `IncrementalDriver`'s dependency graph.
     */
    private recordNgModuleScopeDependencies;
    private get reflector();
    private get coreImportsFrom();
    private get isCore();
    private get importRewriter();
}
export declare class ReferenceGraphAdapter implements ReferencesRegistry {
    private graph;
    constructor(graph: ReferenceGraph);
    add(source: ts.Declaration, ...references: Reference<ts.Declaration>[]): void;
}
