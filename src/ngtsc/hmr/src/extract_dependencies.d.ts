/*!
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import { R3CompiledExpression, R3HmrNamespaceDependency, outputAst as o } from '@angular/compiler';
import { DeclarationNode } from '../../reflection';
import { CompileResult } from '../../transform';
/**
 * Determines the file-level dependencies that the HMR initializer needs to capture and pass along.
 * @param sourceFile File in which the file is being compiled.
 * @param definition Compiled component definition.
 * @param factory Compiled component factory.
 * @param classMetadata Compiled `setClassMetadata` expression, if any.
 * @param debugInfo Compiled `setClassDebugInfo` expression, if any.
 */
export declare function extractHmrDependencies(node: DeclarationNode, definition: R3CompiledExpression, factory: CompileResult, classMetadata: o.Statement | null, debugInfo: o.Statement | null): {
    local: string[];
    external: R3HmrNamespaceDependency[];
};
