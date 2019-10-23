/// <amd-module name="@angular/compiler-cli/ngcc/src/utils" />
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as ts from 'typescript';
import { AbsoluteFsPath, FileSystem } from '../../src/ngtsc/file_system';
export declare function getOriginalSymbol(checker: ts.TypeChecker): (symbol: ts.Symbol) => ts.Symbol;
export declare function isDefined<T>(value: T | undefined | null): value is T;
export declare function getNameText(name: ts.PropertyName | ts.BindingName): string;
/**
 * Parse down the AST and capture all the nodes that satisfy the test.
 * @param node The start node.
 * @param test The function that tests whether a node should be included.
 * @returns a collection of nodes that satisfy the test.
 */
export declare function findAll<T>(node: ts.Node, test: (node: ts.Node) => node is ts.Node & T): T[];
/**
 * Does the given declaration have a name which is an identifier?
 * @param declaration The declaration to test.
 * @returns true if the declaration has an identifier for a name.
 */
export declare function hasNameIdentifier(declaration: ts.Declaration): declaration is ts.Declaration & {
    name: ts.Identifier;
};
export declare type PathMappings = {
    baseUrl: string;
    paths: {
        [key: string]: string[];
    };
};
/**
 * Test whether a path is "relative".
 *
 * Relative paths start with `/`, `./` or `../`; or are simply `.` or `..`.
 */
export declare function isRelativePath(path: string): boolean;
/**
 * Attempt to resolve a `path` to a file by appending the provided `postFixes`
 * to the `path` and checking if the file exists on disk.
 * @returns An absolute path to the first matching existing file, or `null` if none exist.
 */
export declare function resolveFileWithPostfixes(fs: FileSystem, path: AbsoluteFsPath, postFixes: string[]): AbsoluteFsPath | null;
