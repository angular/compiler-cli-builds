/// <amd-module name="@angular/compiler-cli/src/ngtsc/ngmodule_semantics/src/api" />
import { AbsoluteFsPath } from '../../file_system';
import { ClassDeclaration } from '../../reflection';
/**
 * Represents a symbol that is recognizable across incremental rebuilds, which enables the captured
 * metadata to be compared to the prior compilation. This allows for semantic understanding of
 * the changes that have been made in a rebuild, which potentially enables more reuse of work
 * from the prior compilation.
 */
export declare abstract class SemanticSymbol {
    /**
     * The declaration for this symbol.
     */
    readonly decl: ClassDeclaration;
    /**
     * The path of the file that declares this symbol.
     */
    readonly path: AbsoluteFsPath;
    /**
     * The identifier of this symbol, or null if no identifier could be determined. It should
     * uniquely identify the symbol relative to `file`. This is typically just the name of a
     * top-level class declaration, as that uniquely identifies the class within the file.
     *
     * If the identifier is null, then this symbol cannot be recognized across rebuilds. In that
     * case, the symbol is always assumed to have semantically changed to guarantee a proper
     * rebuild.
     */
    readonly identifier: string | null;
    constructor(
    /**
     * The declaration for this symbol.
     */
    decl: ClassDeclaration);
    /**
     * Allows the symbol to be compared to the equivalent symbol in the previous compilation. The
     * return value indicates whether the symbol has been changed in a way such that its public API
     * is affected.
     *
     * This method determines whether a change to _this_ symbol require the symbols that
     * use to this symbol to be re-emitted.
     *
     * Note: `previousSymbol` is obtained from the most recently succeeded compilation. Symbols of
     * failed compilations are never provided.
     *
     * @param previousSymbol The symbol from a prior compilation.
     */
    abstract isPublicApiAffected(previousSymbol: SemanticSymbol): boolean;
    /**
     * Allows the symbol to determine whether its emit is affected. The equivalent symbol from a prior
     * build is given, in addition to the set of symbols of which the public API has changed.
     *
     * This method determines whether a change to _other_ symbols, i.e. those present in
     * `publicApiAffected`, should cause _this_ symbol to be re-emitted.
     *
     * @param previousSymbol The equivalent symbol from a prior compilation. Note that it may be a
     * different type of symbol, if e.g. a Component was changed into a Directive with the same name.
     * @param publicApiAffected The set of symbols which of which the public API has changed.
     */
    isEmitAffected?(previousSymbol: SemanticSymbol, publicApiAffected: Set<SemanticSymbol>): boolean;
}
