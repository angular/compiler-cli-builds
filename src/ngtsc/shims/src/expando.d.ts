/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/// <amd-module name="@angular/compiler-cli/src/ngtsc/shims/src/expando" />
import * as ts from 'typescript';
import { AbsoluteFsPath } from '../../file_system';
/**
 * A `Symbol` which is used to patch extension data onto `ts.SourceFile`s.
 */
export declare const NgExtension: unique symbol;
/**
 * Contents of the `NgExtension` property of a `ts.SourceFile`.
 */
export interface NgExtensionData {
    isTopLevelShim: boolean;
    fileShim: NgFileShimData | null;
    originalReferencedFiles: ReadonlyArray<ts.FileReference> | null;
}
/**
 * A `ts.SourceFile` which has `NgExtension` data.
 */
export interface NgExtendedSourceFile extends ts.SourceFile {
    /**
     * Overrides the type of `referencedFiles` to be writeable.
     */
    referencedFiles: ts.FileReference[];
    [NgExtension]: NgExtensionData;
}
/**
 * Narrows a `ts.SourceFile` if it has an `NgExtension` property.
 */
export declare function isExtended(sf: ts.SourceFile): sf is NgExtendedSourceFile;
/**
 * Returns the `NgExtensionData` for a given `ts.SourceFile`, adding it if none exists.
 */
export declare function sfExtensionData(sf: ts.SourceFile): NgExtensionData;
/**
 * Data associated with a per-shim instance `ts.SourceFile`.
 */
export interface NgFileShimData {
    generatedFrom: AbsoluteFsPath;
    extension: string;
}
/**
 * An `NgExtendedSourceFile` that is a per-file shim and has `NgFileShimData`.
 */
export interface NgFileShimSourceFile extends NgExtendedSourceFile {
    [NgExtension]: NgExtensionData & {
        fileShim: NgFileShimData;
    };
}
/**
 * Check whether `sf` is a per-file shim `ts.SourceFile`.
 */
export declare function isFileShimSourceFile(sf: ts.SourceFile): sf is NgFileShimSourceFile;
/**
 * Check whether `sf` is a shim `ts.SourceFile` (either a per-file shim or a top-level shim).
 */
export declare function isShim(sf: ts.SourceFile): boolean;
/**
 * Copy any shim data from one `ts.SourceFile` to another.
 */
export declare function copyFileShimData(from: ts.SourceFile, to: ts.SourceFile): void;
