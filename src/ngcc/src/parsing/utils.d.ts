/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/// <amd-module name="@angular/compiler-cli/src/ngcc/src/parsing/utils" />
/**
 * Search the `rootDirectory` and its subdirectories to find package.json files.
 * It ignores node dependencies, i.e. those under `node_modules` folders.
 * @param rootDirectory the directory in which we should search.
 */
export declare function findAllPackageJsonFiles(rootDirectory: string): string[];
/**
 * Identify the entry points of a package.
 * @param packageDirectory The absolute path to the root directory that contains this package.
 * @param format The format of the entry point within the package.
 * @returns A collection of paths that point to entry points for this package.
 */
export declare function getEntryPoints(packageDirectory: string, format: string): string[];
