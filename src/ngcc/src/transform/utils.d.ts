/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/// <amd-module name="@angular/compiler-cli/src/ngcc/src/transform/utils" />
export declare const NGCC_VERSION = "7.0.0-beta.5";
/**
 * Represents an entry point to a package or sub-package.
 *
 * It exposes the absolute path to the entry point file and a method to get the `.d.ts` file that
 * corresponds to any source file that belongs to the package (assuming source files and `.d.ts`
 * files have the same directory layout).
 */
export declare class EntryPoint {
    packageRoot: string;
    entryFileName: string;
    entryRoot: string;
    dtsEntryRoot: string;
    /**
     * @param packageRoot The absolute path to the root directory that contains the package.
     * @param relativeEntryPath The relative path to the entry point file.
     * @param relativeDtsEntryPath The relative path to the `.d.ts` entry point file.
     */
    constructor(packageRoot: string, relativeEntryPath: string, relativeDtsEntryPath: string);
}
/**
 * Search the `rootDirectory` and its subdirectories to find `package.json` files.
 * It ignores node dependencies, i.e. those under `node_modules` directories.
 *
 * @param rootDirectory The directory in which we should search.
 */
export declare function findAllPackageJsonFiles(rootDirectory: string): string[];
/**
 * Identify the entry points of a collection of package.json files.
 *
 * @param packageJsonPaths A collection of absolute paths to the package.json files.
 * @param format The format of the entry points to look for within the package.
 *
 * @returns A collection of `EntryPoint`s that correspond to entry points for the package.
 */
export declare function getEntryPoints(packageJsonPaths: string[], format: string): EntryPoint[];
export declare function checkMarkerFile(packageJsonPath: string, format: string): boolean;
export declare function writeMarkerFile(packageJsonPath: string, format: string): void;
