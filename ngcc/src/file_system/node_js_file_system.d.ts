/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/// <amd-module name="@angular/compiler-cli/ngcc/src/file_system/node_js_file_system" />
/// <reference types="node" />
import * as fs from 'fs';
import { AbsoluteFsPath, PathSegment } from '../../../src/ngtsc/path';
import { FileSystem } from './file_system';
/**
 * A wrapper around the Node.js file-system (i.e the `fs` package).
 */
export declare class NodeJSFileSystem implements FileSystem {
    exists(path: AbsoluteFsPath): boolean;
    readFile(path: AbsoluteFsPath): string;
    writeFile(path: AbsoluteFsPath, data: string): void;
    readdir(path: AbsoluteFsPath): PathSegment[];
    lstat(path: AbsoluteFsPath): fs.Stats;
    stat(path: AbsoluteFsPath): fs.Stats;
    pwd(): import("@angular/compiler-cli/src/ngtsc/path/src/types").BrandedPath<"AbsoluteFsPath">;
    copyFile(from: AbsoluteFsPath, to: AbsoluteFsPath): void;
    moveFile(from: AbsoluteFsPath, to: AbsoluteFsPath): void;
    ensureDir(path: AbsoluteFsPath): void;
}
