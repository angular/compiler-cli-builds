/// <amd-module name="@angular/compiler-cli/linker/src/file_linker/partial_linkers/partial_component_linker_1" />
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { ConstantPool, R3ComponentMetadata, R3DeclareComponentMetadata, R3PartialDeclaration } from '@angular/compiler';
import * as o from '@angular/compiler/src/output/output_ast';
import { AstObject } from '../../ast/ast_value';
import { LinkerOptions } from '../linker_options';
import { PartialLinker } from './partial_linker';
/**
 * A `PartialLinker` that is designed to process `ɵɵngDeclareComponent()` call expressions.
 */
export declare class PartialComponentLinkerVersion1<TExpression> implements PartialLinker<TExpression> {
    private readonly options;
    constructor(options: LinkerOptions);
    linkPartialDeclaration(sourceUrl: string, code: string, constantPool: ConstantPool, metaObj: AstObject<R3PartialDeclaration, TExpression>): o.Expression;
}
/**
 * This function derives the `R3ComponentMetadata` from the provided AST object.
 */
export declare function toR3ComponentMeta<TExpression>(metaObj: AstObject<R3DeclareComponentMetadata, TExpression>, code: string, sourceUrl: string, options: LinkerOptions): R3ComponentMetadata;
