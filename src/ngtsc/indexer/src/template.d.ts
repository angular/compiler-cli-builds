/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import { BoundTarget } from '@angular/compiler';
import { TopLevelIdentifier } from './api';
import { ComponentMeta } from './context';
/**
 * Traverses a template AST and builds identifiers discovered in it.
 *
 * @param boundTemplate bound template target, which can be used for querying expression targets.
 * @return identifiers in template
 */
export declare function getTemplateIdentifiers(boundTemplate: BoundTarget<ComponentMeta>): {
    identifiers: Set<TopLevelIdentifier>;
    errors: Error[];
};
