/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/// <amd-module name="@angular/compiler-cli/src/transformers/downlevel_decorators_transform" />
import * as ts from 'typescript';
import { ReflectionHost } from '../ngtsc/reflection';
/**
 * Gets a transformer for downleveling Angular decorators.
 * @param typeChecker Reference to the program's type checker.
 * @param host Reflection host that is used for determining decorators.
 * @param diagnostics List which will be populated with diagnostics if any.
 * @param isCore Whether the current TypeScript program is for the `@angular/core` package.
 * @param isClosureCompilerEnabled Whether closure annotations need to be added where needed.
 */
export declare function getDownlevelDecoratorsTransform(typeChecker: ts.TypeChecker, host: ReflectionHost, diagnostics: ts.Diagnostic[], isCore: boolean, isClosureCompilerEnabled: boolean): ts.TransformerFactory<ts.SourceFile>;
