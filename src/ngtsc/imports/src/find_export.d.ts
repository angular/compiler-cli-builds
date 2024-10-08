/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import ts from 'typescript';
import { ReflectionHost } from '../../reflection';
/**
 * Find the name, if any, by which a node is exported from a given file.
 */
export declare function findExportedNameOfNode(target: ts.Node, file: ts.SourceFile, reflector: ReflectionHost): string | null;
