/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/// <amd-module name="@angular/compiler-cli/src/ngtsc/annotations/src/component" />
import { ConstantPool, InterpolationConfig, ParseError, ParseSourceFile, ParseTemplateOptions, R3ComponentMetadata, Statement, TmplAstNode } from '@angular/compiler';
import { CycleAnalyzer } from '../../cycles';
import { DefaultImportRecorder, ModuleResolver, ReferenceEmitter } from '../../imports';
import { IndexingContext } from '../../indexer';
import { MetadataReader, MetadataRegistry } from '../../metadata';
import { PartialEvaluator } from '../../partial_evaluator';
import { ClassDeclaration, Decorator, ReflectionHost } from '../../reflection';
import { ComponentScopeReader, LocalModuleScopeRegistry } from '../../scope';
import { AnalysisOutput, CompileResult, DecoratorHandler, DetectResult, HandlerPrecedence, ResolveResult } from '../../transform';
import { TemplateSourceMapping, TypeCheckContext } from '../../typecheck';
import { ResourceDependencyRecorder } from '../../util/src/resource_recorder';
import { ResourceLoader } from './api';
export interface ComponentHandlerData {
    meta: R3ComponentMetadata;
    parsedTemplate: ParsedTemplate;
    templateSourceMapping: TemplateSourceMapping;
    metadataStmt: Statement | null;
    parseTemplate: (options?: ParseTemplateOptions) => ParsedTemplate;
}
/**
 * `DecoratorHandler` which handles the `@Component` annotation.
 */
export declare class ComponentDecoratorHandler implements DecoratorHandler<ComponentHandlerData, Decorator> {
    private reflector;
    private evaluator;
    private metaRegistry;
    private metaReader;
    private scopeReader;
    private scopeRegistry;
    private isCore;
    private resourceLoader;
    private rootDirs;
    private defaultPreserveWhitespaces;
    private i18nUseExternalIds;
    private moduleResolver;
    private cycleAnalyzer;
    private refEmitter;
    private defaultImportRecorder;
    private resourceDependencies;
    constructor(reflector: ReflectionHost, evaluator: PartialEvaluator, metaRegistry: MetadataRegistry, metaReader: MetadataReader, scopeReader: ComponentScopeReader, scopeRegistry: LocalModuleScopeRegistry, isCore: boolean, resourceLoader: ResourceLoader, rootDirs: string[], defaultPreserveWhitespaces: boolean, i18nUseExternalIds: boolean, moduleResolver: ModuleResolver, cycleAnalyzer: CycleAnalyzer, refEmitter: ReferenceEmitter, defaultImportRecorder: DefaultImportRecorder, resourceDependencies?: ResourceDependencyRecorder);
    private literalCache;
    private elementSchemaRegistry;
    /**
     * During the asynchronous preanalyze phase, it's necessary to parse the template to extract
     * any potential <link> tags which might need to be loaded. This cache ensures that work is not
     * thrown away, and the parsed template is reused during the analyze phase.
     */
    private preanalyzeTemplateCache;
    readonly precedence = HandlerPrecedence.PRIMARY;
    detect(node: ClassDeclaration, decorators: Decorator[] | null): DetectResult<Decorator> | undefined;
    preanalyze(node: ClassDeclaration, decorator: Decorator): Promise<void> | undefined;
    analyze(node: ClassDeclaration, decorator: Decorator): AnalysisOutput<ComponentHandlerData>;
    index(context: IndexingContext, node: ClassDeclaration, analysis: ComponentHandlerData): void;
    typeCheck(ctx: TypeCheckContext, node: ClassDeclaration, meta: ComponentHandlerData): void;
    resolve(node: ClassDeclaration, analysis: ComponentHandlerData): ResolveResult;
    compile(node: ClassDeclaration, analysis: ComponentHandlerData, pool: ConstantPool): CompileResult[];
    private _resolveLiteral;
    private _resolveEnumValue;
    private _extractStyleUrls;
    private _preloadAndParseTemplate;
    private _extractExternalTemplate;
    private _extractInlineTemplate;
    private _parseTemplate;
    private _expressionToImportedFile;
    private _isCyclicImport;
    private _recordSyntheticImport;
}
/**
 * Information about the template which was extracted during parsing.
 *
 * This contains the actual parsed template as well as any metadata collected during its parsing,
 * some of which might be useful for re-parsing the template with different options.
 */
export interface ParsedTemplate {
    /**
     * The `InterpolationConfig` specified by the user.
     */
    interpolation: InterpolationConfig;
    /**
     * A full path to the file which contains the template.
     *
     * This can be either the original .ts file if the template is inline, or the .html file if an
     * external file was used.
     */
    templateUrl: string;
    /**
     * The string contents of the template.
     *
     * This is the "logical" template string, after expansion of any escaped characters (for inline
     * templates). This may differ from the actual template bytes as they appear in the .ts file.
     */
    template: string;
    /**
     * Any errors from parsing the template the first time.
     */
    errors?: ParseError[] | undefined;
    /**
     * The actual parsed template nodes.
     */
    nodes: TmplAstNode[];
    /**
     * Any styleUrls extracted from the metadata.
     */
    styleUrls: string[];
    /**
     * Any inline styles extracted from the metadata.
     */
    styles: string[];
    /**
     * Whether the template was inline.
     */
    isInline: boolean;
    /**
     * The `ParseSourceFile` for the template.
     */
    file: ParseSourceFile;
}
