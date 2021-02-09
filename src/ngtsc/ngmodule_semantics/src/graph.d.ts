/// <amd-module name="@angular/compiler-cli/src/ngtsc/ngmodule_semantics/src/graph" />
import { AbsoluteFsPath } from '../../file_system';
import { ComponentResolutionRegistry } from '../../incremental/api';
import { DirectiveMeta, NgModuleMeta, PipeMeta } from '../../metadata';
import { ClassDeclaration } from '../../reflection';
import { SemanticSymbol } from './api';
export interface SemanticDependencyResult {
    /**
     * The files that need to be re-emitted.
     */
    needsEmit: Set<AbsoluteFsPath>;
    /**
     * The newly built graph that represents the current compilation.
     */
    newGraph: SemanticDepGraph;
}
/**
 * The semantic dependency graph of a single compilation.
 */
export declare class SemanticDepGraph {
    readonly files: Map<import("@angular/compiler-cli/src/ngtsc/file_system/src/types").BrandedPath<"AbsoluteFsPath">, Map<string, SemanticSymbol>>;
    readonly symbolByDecl: Map<ClassDeclaration<import("@angular/compiler-cli/src/ngtsc/reflection").DeclarationNode>, SemanticSymbol>;
    /**
     * Registers a symbol for the provided declaration as created by the factory function. The symbol
     * is given a unique identifier if possible, such that its equivalent symbol can be obtained from
     * a prior graph even if its declaration node has changed across rebuilds. Symbols without an
     * identifier are only able to find themselves in a prior graph if their declaration node is
     * identical.
     *
     * @param decl
     * @param factory
     */
    registerSymbol(decl: ClassDeclaration, factory: (path: AbsoluteFsPath, decl: ClassDeclaration, identifier: string | null) => SemanticSymbol): void;
    /**
     * Attempts to resolve a symbol in this graph that represents the given symbol from another graph.
     * If no matching symbol could be found, null is returned.
     *
     * @param symbol The symbol from another graph for which its equivalent in this graph should be
     * found.
     */
    getEquivalentSymbol(symbol: SemanticSymbol): SemanticSymbol | null;
    /**
     * Attempts to find the symbol by its identifier.
     */
    private getSymbolByName;
    /**
     * Attempts to resolve the declaration to its semantic symbol.
     */
    getSymbolByDecl(decl: ClassDeclaration): SemanticSymbol | null;
}
/**
 * Implements the logic to go from a previous dependency graph to a new one, along with information
 * on which files have been affected.
 */
export declare class SemanticDepGraphUpdater implements ComponentResolutionRegistry {
    /**
     * The semantic dependency graph of the most recently succeeded compilation, or null if this
     * is the initial build.
     */
    private priorGraph;
    private readonly newGraph;
    /**
     * Contains unresolved symbols that were created for declarations for which there was no symbol
     * registered, which happens for e.g. external declarations.
     */
    private readonly unresolvedSymbols;
    constructor(
    /**
     * The semantic dependency graph of the most recently succeeded compilation, or null if this
     * is the initial build.
     */
    priorGraph: SemanticDepGraph | null);
    addNgModule(metadata: NgModuleMeta): void;
    addDirective(metadata: DirectiveMeta): void;
    addPipe(metadata: PipeMeta): void;
    register(component: ClassDeclaration, usedDirectives: ClassDeclaration[], usedPipes: ClassDeclaration[], isRemotelyScoped: boolean): void;
    /**
     * Takes all facts that have been gathered to create a new semantic dependency graph. In this
     * process, the semantic impact of the changes is determined which results in a set of files that
     * need to be emitted and/or type-checked.
     */
    finalize(): SemanticDependencyResult;
    /**
     * Implements the first phase of the semantic invalidation algorithm by connecting all symbols
     * together.
     */
    private connect;
    private determineInvalidatedFiles;
    private getSymbol;
    /**
     * Gets or creates an `UnresolvedSymbol` for the provided class declaration.
     */
    private getUnresolvedSymbol;
}
