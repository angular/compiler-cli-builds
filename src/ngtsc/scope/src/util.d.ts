/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/// <amd-module name="@angular/compiler-cli/src/ngtsc/scope/src/util" />
import * as ts from 'typescript';
import { Reference } from '../../imports';
import { ReflectionHost } from '../../reflection';
export declare function extractReferencesFromType(checker: ts.TypeChecker, def: ts.TypeNode, ngModuleImportedFrom: string | null, resolutionContext: string): Reference<ts.ClassDeclaration>[];
export declare function readStringType(type: ts.TypeNode): string | null;
export declare function readStringMapType(type: ts.TypeNode): {
    [key: string]: string;
};
export declare function readStringArrayType(type: ts.TypeNode): string[];
export declare function extractDirectiveGuards(node: ts.Declaration, reflector: ReflectionHost): {
    ngTemplateGuards: string[];
    hasNgTemplateContextGuard: boolean;
};
