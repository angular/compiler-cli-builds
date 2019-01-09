/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/// <amd-module name="@angular/compiler-cli/src/ngtsc/util/src/typescript" />
import * as ts from 'typescript';
export declare function isDtsPath(filePath: string): boolean;
export declare function isNonDeclarationTsPath(filePath: string): boolean;
export declare function isFromDtsFile(node: ts.Node): boolean;
