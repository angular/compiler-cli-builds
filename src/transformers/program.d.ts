/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { CompilerHost, CompilerOptions, Program } from './api';
export declare function createProgram({ rootNames, options, host, oldProgram, }: {
    rootNames: ReadonlyArray<string>;
    options: CompilerOptions;
    host: CompilerHost;
    oldProgram?: Program;
}): Program;
