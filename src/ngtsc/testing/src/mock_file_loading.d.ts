/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import { AbsoluteFsPath, FileSystem } from '../../file_system';
import { Folder, TestFile } from '../../file_system/testing';
export declare function loadTestFiles(files: TestFile[]): void;
export declare function loadStandardTestFiles({ fakeCommon, rxjs, forms, }?: {
    fakeCommon?: boolean;
    rxjs?: boolean;
    forms?: boolean;
}): Folder;
export declare function loadTsLib(fs: FileSystem, basePath?: string): void;
export declare function loadFakeCommon(fs: FileSystem, basePath?: string): void;
export declare function loadAngularCore(fs: FileSystem, basePath?: string): void;
export declare function loadAngularForms(fs: FileSystem, basePath?: string): void;
/**
 * Load real files from the real file-system into a mock file-system.
 *
 * Note that this function contains a mix of `FileSystem` calls and NodeJS `fs` calls.
 * This is because the function is a bridge between the "real" file-system (via `fs`) and the "mock"
 * file-system (via `FileSystem`).
 *
 * @param fs the file-system where the directory is to be loaded.
 * @param directoryPath the path to the directory we want to load.
 * @param mockPath the path within the mock file-system where the directory is to be loaded.
 */
export declare function loadTestDirectory(fs: FileSystem, directoryPath: string, mockPath: AbsoluteFsPath): void;
