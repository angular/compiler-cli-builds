/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/// <amd-module name="@angular/compiler-cli/ngcc/src/writing/package_json_updater" />
import { AbsoluteFsPath, FileSystem } from '../../../src/ngtsc/file_system';
import { JsonObject, JsonValue } from '../packages/entry_point';
export declare type PackageJsonChange = [string[], JsonValue];
export declare type WritePackageJsonChangesFn = (changes: PackageJsonChange[], packageJsonPath: AbsoluteFsPath, parsedJson?: JsonObject) => void;
/**
 * A utility object that can be used to safely update values in a `package.json` file.
 *
 * Example usage:
 * ```ts
 * const updatePackageJson = packageJsonUpdater
 *     .createUpdate()
 *     .addChange(['name'], 'package-foo')
 *     .addChange(['scripts', 'foo'], 'echo FOOOO...')
 *     .addChange(['dependencies', 'bar'], '1.0.0')
 *     .writeChanges('/foo/package.json');
 *     // or
 *     // .writeChanges('/foo/package.json', inMemoryParsedJson);
 * ```
 */
export interface PackageJsonUpdater {
    /**
     * Create a `PackageJsonUpdate` object, which provides a fluent API for batching updates to a
     * `package.json` file. (Batching the updates is useful, because it avoid unnecessary I/O
     * operations.)
     */
    createUpdate(): PackageJsonUpdate;
    /**
     * Write a set of changes to the specified `package.json` file and (and optionally a pre-existing,
     * in-memory representation of it).
     *
     * @param changes The set of changes to apply.
     * @param packageJsonPath The path to the `package.json` file that needs to be updated.
     * @param parsedJson A pre-existing, in-memory representation of the `package.json` file that
     *                   needs to be updated as well.
     */
    writeChanges(changes: PackageJsonChange[], packageJsonPath: AbsoluteFsPath, parsedJson?: JsonObject): void;
}
/**
 * A utility class providing a fluent API for recording multiple changes to a `package.json` file
 * (and optionally its in-memory parsed representation).
 *
 * NOTE: This class should generally not be instantiated directly; instances are implicitly created
 *       via `PackageJsonUpdater#createUpdate()`.
 */
export declare class PackageJsonUpdate {
    private writeChangesImpl;
    private changes;
    private applied;
    constructor(writeChangesImpl: WritePackageJsonChangesFn);
    /**
     * Record a change to a `package.json` property. If the ancestor objects do not yet exist in the
     * `package.json` file, they will be created.
     *
     * @param propertyPath The path of a (possibly nested) property to update.
     * @param value The new value to set the property to.
     */
    addChange(propertyPath: string[], value: JsonValue): this;
    /**
     * Write the recorded changes to the associated `package.json` file (and optionally a
     * pre-existing, in-memory representation of it).
     *
     * @param packageJsonPath The path to the `package.json` file that needs to be updated.
     * @param parsedJson A pre-existing, in-memory representation of the `package.json` file that
     *                   needs to be updated as well.
     */
    writeChanges(packageJsonPath: AbsoluteFsPath, parsedJson?: JsonObject): void;
    private ensureNotApplied;
}
/** A `PackageJsonUpdater` that writes directly to the file-system. */
export declare class DirectPackageJsonUpdater implements PackageJsonUpdater {
    private fs;
    constructor(fs: FileSystem);
    createUpdate(): PackageJsonUpdate;
    writeChanges(changes: PackageJsonChange[], packageJsonPath: AbsoluteFsPath, preExistingParsedJson?: JsonObject): void;
}
export declare function applyChange(ctx: JsonObject, propPath: string[], value: JsonValue): void;
