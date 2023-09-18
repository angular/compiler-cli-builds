/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import ts from 'typescript';
import { MetadataReader } from '../../metadata';
import { DocEntry } from './entities';
/**
 * Extracts all information from a source file that may be relevant for generating
 * public API documentation.
 */
export declare class DocsExtractor {
    private typeChecker;
    private metadataReader;
    constructor(typeChecker: ts.TypeChecker, metadataReader: MetadataReader);
    /**
     * Gets the set of all documentable entries from a source file.
     * @param sourceFile The file from which to extract documentable entries.
     */
    extractAll(sourceFile: ts.SourceFile): DocEntry[];
    /** Gets whether the given AST node has an `export` modifier. */
    private isExported;
}
