/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import ts from 'typescript';
export declare function aliasTransformFactory(exportStatements: Map<string, Map<string, [string, string]>>): ts.TransformerFactory<ts.SourceFile>;
