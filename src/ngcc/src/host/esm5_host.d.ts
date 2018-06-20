/// <amd-module name="angular/packages/compiler-cli/src/ngcc/src/host/esm5_host" />
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as ts from 'typescript';
import { ClassMember, Decorator, Parameter } from '../../../ngtsc/host';
import { TypeScriptReflectionHost } from '../../../ngtsc/metadata/src/reflector';
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
export declare class Esm5ReflectionHost extends TypeScriptReflectionHost implements NgccReflectionHost {
    constructor(checker: ts.TypeChecker);
    getDecoratorsOfDeclaration(declaration: ts.Declaration): Decorator[] | null;
    isClass(node: ts.Node): node is ts.Declaration;
    getClassDecorators(classSymbol: ts.Symbol): Decorator[];
    getMemberDecorators(classSymbol: ts.Symbol): Map<string, Decorator[]>;
    getConstructorParamDecorators(classSymbol: ts.Symbol): Map<string, Decorator[]>;
    getMembersOfClass(clazz: ts.Declaration): ClassMember[];
    getConstructorParameters(declaration: ts.Declaration): Parameter[] | null;
}
