/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
/**
 * Gets all built Angular NPM package artifacts by querying the Bazel runfiles.
 * In case there is a runfiles manifest (e.g. on Windows), the packages are resolved
 * through the manifest because the runfiles are not symlinked and cannot be searched
 * within the real filesystem.
 */
export declare function getAngularPackagesFromRunfiles(): {
    name: string;
    pkgPath: string;
}[];
/** Resolves a file or directory from the Bazel runfiles. */
export declare function resolveFromRunfiles(manifestPath: string): string;
