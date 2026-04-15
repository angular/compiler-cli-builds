/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import { TypeCheckBlockMetadata, TcbTypeCheckBlockMetadata, TcbComponentMetadata } from '../api';
import { Environment } from './environment';
import { Reference } from '../../imports';
import { ClassDeclaration } from '../../reflection';
import ts from 'typescript';
import { TcbGenericContextBehavior } from './ops/context';
/**
 * Adapts the compiler's `TypeCheckBlockMetadata` (which includes full TS AST nodes)
 * into a purely detached `TcbTypeCheckBlockMetadata` that can be mapped to JSON.
 */
export declare function adaptTypeCheckBlockMetadata(ref: Reference<ClassDeclaration<ts.ClassDeclaration>>, meta: TypeCheckBlockMetadata, env: Environment, genericContextBehavior: TcbGenericContextBehavior): {
    tcbMeta: TcbTypeCheckBlockMetadata;
    component: TcbComponentMetadata;
};
