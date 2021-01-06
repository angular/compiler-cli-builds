/// <amd-module name="@angular/compiler-cli/linker/src/file_linker/partial_linkers/partial_linker_selector" />
import { LinkerOptions } from '../linker_options';
import { PartialLinker } from './partial_linker';
export declare const ɵɵngDeclareDirective = "\u0275\u0275ngDeclareDirective";
export declare const ɵɵngDeclareComponent = "\u0275\u0275ngDeclareComponent";
export declare const declarationFunctions: string[];
export declare class PartialLinkerSelector<TExpression> {
    private options;
    /**
     * A database of linker instances that should be used if their given semver range satisfies the
     * version found in the code to be linked.
     *
     * Note that the ranges are checked in order, and the first matching range will be selected, so
     * ranges should be most restrictive first.
     *
     * Also, ranges are matched to include "pre-releases", therefore if the range is `>=11.1.0-next.1`
     * then this includes `11.1.0-next.2` and also `12.0.0-next.1`.
     *
     * Finally, note that we always start with the current version (i.e. `11.1.0-next.3+62.sha-7eadf2e`). This
     * allows the linker to work on local builds effectively.
     */
    private linkers;
    constructor(options: LinkerOptions);
    /**
     * Returns true if there are `PartialLinker` classes that can handle functions with this name.
     */
    supportsDeclaration(functionName: string): boolean;
    /**
     * Returns the `PartialLinker` that can handle functions with the given name and version.
     * Throws an error if there is none.
     */
    getLinker(functionName: string, version: string): PartialLinker<TExpression>;
}
