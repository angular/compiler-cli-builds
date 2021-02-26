/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/// <amd-module name="@angular/compiler-cli/src/ngtsc/incremental/semantic_graph/src/graph" />
import { Expression } from '@angular/compiler';
import { AbsoluteFsPath } from '../../../file_system';
import { ClassDeclaration } from '../../../reflection';
import { SemanticReference, SemanticSymbol } from './api';
export interface SemanticDependencyResult {
    /**
     * The files that need to be re-emitted.
     */
    needsEmit: Set<AbsoluteFsPath>;
    needsTypeCheckEmit: Set<AbsoluteFsPath>;
    /**
     * The newly built graph that represents the current compilation.
     */
    newGraph: SemanticDepGraph;
}
/**
 * Represents a declaration for which no semantic symbol has been registered. For example,
 * declarations from external dependencies have not been explicitly registered and are represented
 * by this symbol. This allows the unresolved symbol to still be compared to a symbol from a prior
 * compilation.
 */
export declare class OpaqueSymbol extends SemanticSymbol {
    isPublicApiAffected(): false;
    isTypeCheckEmitAffected(): false;
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
     * @param symbol
     */
    registerSymbol(symbol: SemanticSymbol): void;
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
export declare class SemanticDepGraphUpdater {
    /**
     * The semantic dependency graph of the most recently succeeded compilation, or null if this
     * is the initial build.
     */
    private priorGraph;
    private readonly newGraph;
    /**
     * Contains opaque symbols that were created for declarations for which there was no symbol
     * registered, which happens for e.g. external declarations.
     */
    private readonly opaqueSymbols;
    constructor(
    /**
     * The semantic dependency graph of the most recently succeeded compilation, or null if this
     * is the initial build.
     */
    priorGraph: SemanticDepGraph | null);
    registerSymbol(symbol: SemanticSymbol): void;
    /**
     * Takes all facts that have been gathered to create a new semantic dependency graph. In this
     * process, the semantic impact of the changes is determined which results in a set of files that
     * need to be emitted and/or type-checked.
     */
    finalize(): SemanticDependencyResult;
    private determineInvalidatedFiles;
    private determineInvalidatedTypeCheckFiles;
    getSemanticReference(decl: ClassDeclaration, expr: Expression): SemanticReference;
    getSymbol(decl: ClassDeclaration): SemanticSymbol;
    /**
     * Gets or creates an `OpaqueSymbol` for the provided class declaration.
     */
    private getOpaqueSymbol;
}
