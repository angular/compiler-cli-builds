/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import ts from 'typescript';
/**
 * If the `fileName` is determined to benefit from caching across tests, a parsed `ts.SourceFile`
 * is returned from a shared cache. If caching is not applicable for the requested `fileName`, then
 * `null` is returned.
 *
 * Even if a `ts.SourceFile` already exists for the given `fileName` will the contents be loaded
 * from disk, such that it can be verified whether the cached `ts.SourceFile` is identical to the
 * disk contents. If there is a difference, a new `ts.SourceFile` is parsed from the loaded contents
 * which replaces the prior cache entry.
 *
 * @param fileName the path of the file to request a source file for.
 * @param load a callback to load the contents of the file; this is even called when a cache entry
 * is available to verify that the cached `ts.SourceFile` corresponds with the contents on disk.
 */
export declare function getCachedSourceFile(fileName: string, load: () => string | undefined): ts.SourceFile | null;
