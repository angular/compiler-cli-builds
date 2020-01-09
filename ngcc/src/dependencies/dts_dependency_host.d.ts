/// <amd-module name="@angular/compiler-cli/ngcc/src/dependencies/dts_dependency_host" />
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { FileSystem } from '../../../src/ngtsc/file_system';
import { PathMappings } from '../utils';
import { EsmDependencyHost } from './esm_dependency_host';
/**
 * Helper functions for computing dependencies via typings files.
 */
export declare class DtsDependencyHost extends EsmDependencyHost {
    constructor(fs: FileSystem, pathMappings?: PathMappings);
}
