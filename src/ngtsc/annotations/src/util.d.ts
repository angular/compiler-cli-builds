/// <amd-module name="@angular/compiler-cli/src/ngtsc/annotations/src/util" />
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Expression, R3DependencyMetadata } from '@angular/compiler';
import * as ts from 'typescript';
import { Decorator, ReflectionHost } from '../../host';
import { Reference } from '../../metadata';
export declare function getConstructorDependencies(clazz: ts.ClassDeclaration, reflector: ReflectionHost): R3DependencyMetadata[];
export declare function referenceToExpression(ref: Reference, context: ts.SourceFile): Expression;
export declare function isAngularCore(decorator: Decorator): boolean;
