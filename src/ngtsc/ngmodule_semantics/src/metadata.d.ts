/// <amd-module name="@angular/compiler-cli/src/ngtsc/ngmodule_semantics/src/metadata" />
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { DirectiveMeta, MetadataRegistry, NgModuleMeta, PipeMeta } from '../../metadata';
import { SemanticDepGraphUpdater } from './graph';
export declare class SemanticDepGraphAdapter implements MetadataRegistry {
    private updater;
    constructor(updater: SemanticDepGraphUpdater);
    registerDirectiveMetadata(meta: DirectiveMeta): void;
    registerNgModuleMetadata(meta: NgModuleMeta): void;
    registerPipeMetadata(meta: PipeMeta): void;
}
