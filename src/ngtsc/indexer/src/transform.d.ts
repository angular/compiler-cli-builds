/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import { DeclarationNode } from '../../reflection';
import { IndexedComponent } from './api';
import { IndexingContext } from './context';
/**
 * Generates `IndexedComponent` entries from a `IndexingContext`, which has information
 * about components discovered in the program registered in it.
 *
 * The context must be populated before `generateAnalysis` is called.
 */
export declare function generateAnalysis(context: IndexingContext): Map<DeclarationNode, IndexedComponent>;
