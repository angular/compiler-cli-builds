/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/// <amd-module name="@angular/compiler-cli/src/ngtsc/typecheck/src/template_symbol_builder" />
import { AST, TmplAstElement, TmplAstNode, TmplAstReference, TmplAstTemplate, TmplAstVariable } from '@angular/compiler';
import * as ts from 'typescript';
import { AbsoluteFsPath } from '../../file_system';
import { ElementSymbol, ReferenceSymbol, Symbol, TemplateSymbol, VariableSymbol } from '../api';
import { TemplateData } from './context';
/**
 * A class which extracts information from a type check block.
 * This class is essentially used as just a closure around the constructor parameters.
 */
export declare class SymbolBuilder {
    private readonly typeChecker;
    private readonly shimPath;
    private readonly typeCheckBlock;
    private readonly templateData;
    constructor(typeChecker: ts.TypeChecker, shimPath: AbsoluteFsPath, typeCheckBlock: ts.Node, templateData: TemplateData);
    getSymbol(node: TmplAstTemplate | TmplAstElement): TemplateSymbol | ElementSymbol | null;
    getSymbol(node: TmplAstReference | TmplAstVariable): ReferenceSymbol | VariableSymbol | null;
    getSymbol(node: AST | TmplAstNode): Symbol | null;
    private getSymbolOfAstTemplate;
    private getSymbolOfElement;
    private getDirectivesOfNode;
    private getDirectiveMeta;
    private getSymbolOfBoundEvent;
    private getSymbolOfInputBinding;
    private getDirectiveSymbolForAccessExpression;
    private getSymbolOfVariable;
    private getSymbolOfReference;
    private getSymbolOfTemplateExpression;
    private getSymbolOfTsNode;
    private getShimPositionForNode;
}
