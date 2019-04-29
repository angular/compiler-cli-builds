/// <amd-module name="@angular/compiler-cli/ngcc/src/rendering/esm5_renderer" />
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import MagicString from 'magic-string';
import { CompiledClass } from '../analysis/decoration_analyzer';
import { FileSystem } from '../file_system/file_system';
import { NgccReflectionHost } from '../host/ngcc_host';
import { Logger } from '../logging/logger';
import { EntryPointBundle } from '../packages/entry_point_bundle';
import { EsmRenderer } from './esm_renderer';
export declare class Esm5Renderer extends EsmRenderer {
    constructor(fs: FileSystem, logger: Logger, host: NgccReflectionHost, isCore: boolean, bundle: EntryPointBundle);
    /**
     * Add the definitions to each decorated class
     */
    addDefinitions(output: MagicString, compiledClass: CompiledClass, definitions: string): void;
}
