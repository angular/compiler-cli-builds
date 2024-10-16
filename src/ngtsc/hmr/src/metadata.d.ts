/*!
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import { R3CompiledExpression, R3HmrMetadata, outputAst as o } from '@angular/compiler';
import { DeclarationNode, ReflectionHost } from '../../reflection';
import { CompileResult } from '../../transform';
import ts from 'typescript';
/**
 * Extracts the HMR metadata for a class declaration.
 * @param clazz Class being analyzed.
 * @param reflection Reflection host.
 * @param compilerHost Compiler host to use when resolving file names.
 * @param rootDirs Root directories configured by the user.
 * @param definition Analyzed component definition.
 * @param factory Analyzed component factory.
 * @param classMetadata Analyzed `setClassMetadata` expression, if any.
 * @param debugInfo Analyzed `setClassDebugInfo` expression, if any.
 */
export declare function extractHmrMetatadata(clazz: DeclarationNode, reflection: ReflectionHost, compilerHost: Pick<ts.CompilerHost, 'getCanonicalFileName'>, rootDirs: readonly string[], definition: R3CompiledExpression, factory: CompileResult, classMetadata: o.Statement | null, debugInfo: o.Statement | null): R3HmrMetadata | null;
