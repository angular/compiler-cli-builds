/// <amd-module name="@angular/compiler-cli/src/ngcc/src/host/ngcc_host" />
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as ts from 'typescript';
import { ReflectionHost } from '../../../ngtsc/host';
import { DecoratedFile } from './decorated_file';
export declare const PRE_NGCC_MARKER = "__PRE_NGCC__";
export declare const POST_NGCC_MARKER = "__POST_NGCC__";
export declare type SwitchableVariableDeclaration = ts.VariableDeclaration & {
    initializer: ts.Identifier;
};
export declare function isSwitchableVariableDeclaration(node: ts.Node): node is SwitchableVariableDeclaration;
/**
 * A reflection host that has extra methods for looking at non-Typescript package formats
 */
export interface NgccReflectionHost extends ReflectionHost {
    /**
     * Find a symbol for a declaration that we think is a class.
     * @param declaration The declaration whose symbol we are finding
     * @returns the symbol for the declaration or `undefined` if it is not
     * a "class" or has no symbol.
     */
    getClassSymbol(node: ts.Node): ts.Symbol | undefined;
    /**
     * Search the given module for variable declarations in which the initializer
     * is an identifier marked with the `PRE_NGCC_MARKER`.
     * @param module The module in which to search for switchable declarations.
     * @returns An array of variable declarations that match.
     */
    getSwitchableDeclarations(module: ts.Node): SwitchableVariableDeclaration[];
    /**
     * Find all the files accessible via an entry-point, that contain decorated classes.
     * @param entryPoint The starting point file for finding files that contain decorated classes.
     * @returns A collection of files objects that hold info about the decorated classes and import
     * information.
     */
    findDecoratedFiles(entryPoint: ts.SourceFile): Map<ts.SourceFile, DecoratedFile>;
}
