/// <amd-module name="@angular/compiler-cli/src/ngtsc/ngmodule_semantics/src/symbols" />
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { AbsoluteFsPath } from '../../file_system';
import { ClassDeclaration } from '../../reflection';
import { SemanticSymbol, SymbolResolver } from './api';
/**
 * Represents an Angular pipe.
 */
export declare class PipeSymbol extends SemanticSymbol {
    readonly name: string;
    constructor(path: AbsoluteFsPath, decl: ClassDeclaration, symbolName: string | null, name: string);
    isPublicApiAffected(previousSymbol: SemanticSymbol): boolean;
}
/**
 * Represents an Angular directive. Components are represented by `ComponentSymbol`, which inherits
 * from this symbol.
 */
export declare class DirectiveSymbol extends SemanticSymbol {
    readonly selector: string | null;
    readonly inputs: string[];
    readonly outputs: string[];
    readonly exportAs: string[] | null;
    constructor(path: AbsoluteFsPath, decl: ClassDeclaration, symbolName: string | null, selector: string | null, inputs: string[], outputs: string[], exportAs: string[] | null);
    isPublicApiAffected(previousSymbol: SemanticSymbol): boolean;
}
/**
 * Represents an Angular component.
 */
export declare class ComponentSymbol extends DirectiveSymbol {
    usedDirectives: SemanticSymbol[];
    usedPipes: SemanticSymbol[];
    isRemotelyScoped: boolean;
    isEmitAffected(previousSymbol: SemanticSymbol, publicApiAffected: Set<SemanticSymbol>): boolean;
}
/**
 * Represents an Angular NgModule.
 */
export declare class NgModuleSymbol extends SemanticSymbol {
    private readonly rawDeclarations;
    private hasRemoteScopes;
    constructor(path: AbsoluteFsPath, decl: ClassDeclaration, symbolName: string | null, rawDeclarations: ClassDeclaration[]);
    connect(resolve: SymbolResolver): void;
    isPublicApiAffected(previousSymbol: SemanticSymbol): boolean;
    isEmitAffected(previousSymbol: SemanticSymbol): boolean;
}
