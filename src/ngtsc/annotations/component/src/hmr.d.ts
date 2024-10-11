/*!
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import { R3HmrInitializerMetadata } from '@angular/compiler';
import { DeclarationNode, ReflectionHost } from '../../../reflection';
import ts from 'typescript';
/**
 * Extracts the metadata necessary to generate an HMR initializer.
 */
export declare function extractHmrInitializerMeta(clazz: DeclarationNode, reflection: ReflectionHost, compilerHost: Pick<ts.CompilerHost, 'getCanonicalFileName'>, rootDirs: readonly string[]): R3HmrInitializerMetadata | null;
