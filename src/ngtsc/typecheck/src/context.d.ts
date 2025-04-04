/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import { BoundTarget, ParseError, R3TargetBinder, SchemaMetadata, TmplAstHostElement, TmplAstNode } from '@angular/compiler';
import ts from 'typescript';
import { AbsoluteFsPath } from '../../file_system';
import { Reference, ReferenceEmitter } from '../../imports';
import { PerfRecorder } from '../../perf';
import { FileUpdate } from '../../program_driver';
import { ClassDeclaration, ReflectionHost } from '../../reflection';
import { HostBindingsContext, TemplateDiagnostic, TypeCheckId, SourceMapping, TypeCheckableDirectiveMeta, TypeCheckContext, TypeCheckingConfig, TypeCtorMetadata, TemplateContext } from '../api';
import { DomSchemaChecker } from './dom';
import { OutOfBandDiagnosticRecorder } from './oob';
import { DirectiveSourceManager } from './source';
import { TypeCheckFile } from './type_check_file';
export interface ShimTypeCheckingData {
    /**
     * Path to the shim file.
     */
    path: AbsoluteFsPath;
    /**
     * Any `ts.Diagnostic`s which were produced during the generation of this shim.
     *
     * Some diagnostics are produced during creation time and are tracked here.
     */
    genesisDiagnostics: TemplateDiagnostic[];
    /**
     * Whether any inline operations for the input file were required to generate this shim.
     */
    hasInlines: boolean;
    /**
     * Map of `TypeCheckId` to information collected about the template during the template
     * type-checking process.
     */
    data: Map<TypeCheckId, TypeCheckData>;
}
/**
 * Data tracked for each class processed by the type-checking system.
 */
export interface TypeCheckData {
    /**
     * Template nodes for which the TCB was generated.
     */
    template: TmplAstNode[] | null;
    /**
     * `BoundTarget` which was used to generate the TCB, and contains bindings for the associated
     * template nodes.
     */
    boundTarget: BoundTarget<TypeCheckableDirectiveMeta>;
    /**
     * Errors found while parsing the template, which have been converted to diagnostics.
     */
    templateParsingDiagnostics: TemplateDiagnostic[];
    /**
     * Element representing the host bindings of a directive.
     */
    hostElement: TmplAstHostElement | null;
}
/**
 * Data for an input file which is still in the process of template type-checking code generation.
 */
export interface PendingFileTypeCheckingData {
    /**
     * Whether any inline code has been required by the shim yet.
     */
    hasInlines: boolean;
    /**
     * Source mapping information for mapping diagnostics from inlined type check blocks back to the
     * original template.
     */
    sourceManager: DirectiveSourceManager;
    /**
     * Map of in-progress shim data for shims generated from this input file.
     */
    shimData: Map<AbsoluteFsPath, PendingShimData>;
}
export interface PendingShimData {
    /**
     * Recorder for out-of-band diagnostics which are raised during generation.
     */
    oobRecorder: OutOfBandDiagnosticRecorder;
    /**
     * The `DomSchemaChecker` in use for this template, which records any schema-related diagnostics.
     */
    domSchemaChecker: DomSchemaChecker;
    /**
     * Shim file in the process of being generated.
     */
    file: TypeCheckFile;
    /**
     * Map of `TypeCheckId` to information collected about the template as it's ingested.
     */
    data: Map<TypeCheckId, TypeCheckData>;
}
/**
 * Adapts the `TypeCheckContextImpl` to the larger template type-checking system.
 *
 * Through this interface, a single `TypeCheckContextImpl` (which represents one "pass" of template
 * type-checking) requests information about the larger state of type-checking, as well as reports
 * back its results once finalized.
 */
export interface TypeCheckingHost {
    /**
     * Retrieve the `DirectiveSourceManager` responsible for directives in the given input file path.
     */
    getSourceManager(sfPath: AbsoluteFsPath): DirectiveSourceManager;
    /**
     * Whether a particular class should be included in the current type-checking pass.
     *
     * Not all classes offered to the `TypeCheckContext` for checking may require processing. For
     * example, the directive may have results already available from a prior pass or from a previous
     * program.
     */
    shouldCheckClass(node: ts.ClassDeclaration): boolean;
    /**
     * Report data from a shim generated from the given input file path.
     */
    recordShimData(sfPath: AbsoluteFsPath, data: ShimTypeCheckingData): void;
    /**
     * Record that all of the classes within the given input file path had code generated - that
     * is, coverage for the file can be considered complete.
     */
    recordComplete(sfPath: AbsoluteFsPath): void;
}
/**
 * How a type-checking context should handle operations which would require inlining.
 */
export declare enum InliningMode {
    /**
     * Use inlining operations when required.
     */
    InlineOps = 0,
    /**
     * Produce diagnostics if an operation would require inlining.
     */
    Error = 1
}
/**
 * A template type checking context for a program.
 *
 * The `TypeCheckContext` allows registration of directives to be type checked.
 */
export declare class TypeCheckContextImpl implements TypeCheckContext {
    private config;
    private compilerHost;
    private refEmitter;
    private reflector;
    private host;
    private inlining;
    private perf;
    private fileMap;
    constructor(config: TypeCheckingConfig, compilerHost: Pick<ts.CompilerHost, 'getCanonicalFileName'>, refEmitter: ReferenceEmitter, reflector: ReflectionHost, host: TypeCheckingHost, inlining: InliningMode, perf: PerfRecorder);
    /**
     * A `Map` of `ts.SourceFile`s that the context has seen to the operations (additions of methods
     * or type-check blocks) that need to be eventually performed on that file.
     */
    private opMap;
    /**
     * Tracks when an a particular class has a pending type constructor patching operation already
     * queued.
     */
    private typeCtorPending;
    /**
     * Register a template to potentially be type-checked.
     *
     * Implements `TypeCheckContext.addTemplate`.
     */
    addDirective(ref: Reference<ClassDeclaration<ts.ClassDeclaration>>, binder: R3TargetBinder<TypeCheckableDirectiveMeta>, schemas: SchemaMetadata[], templateContext: TemplateContext | null, hostBindingContext: HostBindingsContext | null, isStandalone: boolean): void;
    /**
     * Record a type constructor for the given `node` with the given `ctorMetadata`.
     */
    addInlineTypeCtor(fileData: PendingFileTypeCheckingData, sf: ts.SourceFile, ref: Reference<ClassDeclaration<ts.ClassDeclaration>>, ctorMeta: TypeCtorMetadata): void;
    /**
     * Transform a `ts.SourceFile` into a version that includes type checking code.
     *
     * If this particular `ts.SourceFile` requires changes, the text representing its new contents
     * will be returned. Otherwise, a `null` return indicates no changes were necessary.
     */
    transform(sf: ts.SourceFile): string | null;
    finalize(): Map<AbsoluteFsPath, FileUpdate>;
    private addInlineTypeCheckBlock;
    private pendingShimForClass;
    private dataForFile;
}
export declare function getTemplateDiagnostics(parseErrors: ParseError[], templateId: TypeCheckId, sourceMapping: SourceMapping): TemplateDiagnostic[];
