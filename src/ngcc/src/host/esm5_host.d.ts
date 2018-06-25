/// <amd-module name="angular/packages/compiler-cli/src/ngcc/src/host/esm5_host" />
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as ts from 'typescript';
import { ClassMember, Decorator, Import, Parameter } from '../../../ngtsc/host';
import { NgccReflectionHost } from './ngcc_host';
/**
 * ESM5 packages contain ECMAScript IIFE functions that act like classes. For example:
 *
 * ```
 * var CommonModule = (function () {
 *  function CommonModule() {
 *  }
 *  CommonModule.decorators = [ ... ];
 * ```
 *
 * Items are decorated if they have a static property called `decorators`.
 *
 */
export declare class Esm5ReflectionHost implements NgccReflectionHost {
    protected checker: ts.TypeChecker;
    constructor(checker: ts.TypeChecker);
    getDecoratorsOfDeclaration(declaration: ts.Declaration): Decorator[] | null;
    getMembersOfClass(clazz: ts.Declaration): ClassMember[];
    getConstructorParameters(declaration: ts.Declaration): Parameter[] | null;
    getImportOfIdentifier(id: ts.Identifier): Import | null;
    isClass(node: ts.Node): node is ts.Declaration;
}
