/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import { Reference } from '../../imports';
import { ClassDeclaration } from '../../reflection';
import { DirectiveMeta, MetadataReader } from './api';
/**
 * Given a reference to a directive, return a flattened version of its `DirectiveMeta` metadata
 * which includes metadata from its entire inheritance chain.
 *
 * The returned `DirectiveMeta` will either have `baseClass: null` if the inheritance chain could be
 * fully resolved, or `baseClass: 'dynamic'` if the inheritance chain could not be completely
 * followed.
 */
export declare function flattenInheritedDirectiveMetadata(reader: MetadataReader, dir: Reference<ClassDeclaration>): DirectiveMeta | null;
