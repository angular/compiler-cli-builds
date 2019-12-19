/// <amd-module name="@angular/compiler-cli/ngcc/src/packages/build_marker" />
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { AbsoluteFsPath } from '../../../src/ngtsc/file_system';
import { PackageJsonUpdater } from '../writing/package_json_updater';
import { EntryPointPackageJson, PackageJsonFormatProperties } from './entry_point';
export declare const NGCC_VERSION = "9.0.0-rc.7";
/**
 * Check whether ngcc has already processed a given entry-point format.
 *
 * The entry-point is defined by the package.json contents provided.
 * The format is defined by the provided property name of the path to the bundle in the package.json
 *
 * @param packageJson The parsed contents of the package.json file for the entry-point.
 * @param format The entry-point format property in the package.json to check.
 * @returns true if the entry-point and format have already been processed with this ngcc version.
 * @throws Error if the `packageJson` property is not an object.
 * @throws Error if the entry-point has already been processed with a different ngcc version.
 */
export declare function hasBeenProcessed(packageJson: EntryPointPackageJson, format: PackageJsonFormatProperties, entryPointPath: AbsoluteFsPath): boolean;
/**
 * Write a build marker for the given entry-point and format properties, to indicate that they have
 * been compiled by this version of ngcc.
 *
 * @param pkgJsonUpdater The writer to use for updating `package.json`.
 * @param packageJson The parsed contents of the `package.json` file for the entry-point.
 * @param packageJsonPath The absolute path to the `package.json` file.
 * @param properties The properties in the `package.json` of the formats for which we are writing
 *                   the marker.
 */
export declare function markAsProcessed(pkgJsonUpdater: PackageJsonUpdater, packageJson: EntryPointPackageJson, packageJsonPath: AbsoluteFsPath, formatProperties: PackageJsonFormatProperties[]): void;
