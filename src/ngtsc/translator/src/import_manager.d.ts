/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import ts from 'typescript';
import { ImportRewriter } from '../../imports';
import { ImportGenerator, NamedImport } from './api/import_generator';
/**
 * Information about a namespace import that has been added to a module.
 */
export interface NamespaceImport {
    /** The name of the module that has been imported. */
    specifier: string;
    /** The `ts.Identifier` by which the imported module is known. */
    qualifier: ts.Identifier;
}
/**
 * Information about a side effect import that has been added to a module.
 */
export interface SideEffectImport {
    /** The name of the module that has been imported. */
    specifier: string;
    /**
     * The qualifier of a side effect import is always non-existent, and that can be used to check
     * whether the import is side effect or not.
     */
    qualifier: null;
}
/**
 * Information about an import that has been added to a module.
 */
export type Import = NamespaceImport | SideEffectImport;
export declare class ImportManager implements ImportGenerator<ts.Identifier> {
    protected rewriter: ImportRewriter;
    private prefix;
    private factory;
    private specifierToIdentifier;
    private nextIndex;
    constructor(rewriter?: ImportRewriter, prefix?: string, factory?: ts.NodeFactory);
    generateNamespaceImport(moduleName: string): ts.Identifier;
    generateNamedImport(moduleName: string, originalSymbol: string): NamedImport<ts.Identifier>;
    generateSideEffectImport(moduleName: string): void;
    getAllImports(contextPath: string): Import[];
}
