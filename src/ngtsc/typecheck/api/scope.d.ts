/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/// <amd-module name="@angular/compiler-cli/src/ngtsc/typecheck/api/scope" />
import ts from 'typescript';
import { Reference } from '../../imports';
import { ClassDeclaration } from '../../reflection';
import { SymbolWithValueDeclaration } from '../../util/src/typescript';
/**
 * A PotentialImport for some Angular trait has a TypeScript module specifier, which can be
 * relative, as well as an identifier name.
 */
export interface PotentialImport {
    kind: PotentialImportKind;
    moduleSpecifier: string;
    symbolName: string;
}
/**
 * Which kind of Angular Trait the import targets.
 */
export declare enum PotentialImportKind {
    NgModule = 0,
    Standalone = 1
}
/**
 * Metadata on a directive which is available in a template.
 */
export interface PotentialDirective {
    ref: Reference<ClassDeclaration>;
    /**
     * The `ts.Symbol` for the directive class.
     */
    tsSymbol: SymbolWithValueDeclaration;
    /**
     * The module which declares the directive.
     */
    ngModule: ClassDeclaration | null;
    /**
     * The selector for the directive or component.
     */
    selector: string | null;
    /**
     * `true` if this directive is a component.
     */
    isComponent: boolean;
    /**
     * `true` if this directive is a structural directive.
     */
    isStructural: boolean;
    /**
     * Whether or not this directive is in scope.
     */
    isInScope: boolean;
}
/**
 * Metadata for a pipe which is available in a template.
 */
export interface PotentialPipe {
    /**
     * The `ts.Symbol` for the pipe class.
     */
    tsSymbol: ts.Symbol;
    /**
     * Name of the pipe.
     */
    name: string;
    /**
     * Whether or not this pipe is in scope.
     */
    isInScope: boolean;
}
