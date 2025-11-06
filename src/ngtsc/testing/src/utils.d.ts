/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import ts from 'typescript';
import { AbsoluteFsPath } from '../../file_system';
import { DeclarationNode } from '../../reflection';
export declare function makeProgram(files: {
    name: AbsoluteFsPath;
    contents: string;
    isRoot?: boolean;
}[], options?: ts.CompilerOptions, host?: ts.CompilerHost, checkForErrors?: boolean): {
    program: ts.Program;
    host: ts.CompilerHost;
    options: ts.CompilerOptions;
};
/**
 * Search the file specified by `fileName` in the given `program` for a declaration that has the
 * name `name` and passes the `predicate` function.
 *
 * An error will be thrown if there is not at least one AST node with the given `name` and passes
 * the `predicate` test.
 */
export declare function getDeclaration<T extends DeclarationNode>(program: ts.Program, fileName: AbsoluteFsPath, name: string, assert: (value: any) => value is T): T;
/**
 * Walk the AST tree from the `rootNode` looking for a declaration that has the given `name`.
 */
export declare function walkForDeclarations(name: string, rootNode: ts.Node): DeclarationNode[];
export declare function isNamedDeclaration(node: ts.Node): node is ts.Declaration & {
    name: ts.Identifier;
};
export declare function expectCompleteReuse(program: ts.Program): void;
export declare function getSourceCodeForDiagnostic(diag: ts.Diagnostic): string;
export declare function diagnosticToNode<T extends ts.Node>(diagnostic: ts.Diagnostic | ts.DiagnosticRelatedInformation, guard: (node: ts.Node) => node is T): T;
