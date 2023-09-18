/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import ts from 'typescript';
import { MetadataReader } from '../../metadata';
import { ClassDeclaration } from '../../reflection';
import { ClassEntry } from './entities';
/** Extracts documentation info for a class, potentially including Angular-specific info.  */
export declare function extractClass(classDeclaration: ClassDeclaration & ts.ClassDeclaration, metadataReader: MetadataReader, typeChecker: ts.TypeChecker): ClassEntry;
